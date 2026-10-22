<?php

namespace BermaroTracking\Helpers;

use IO\Models\LocalizedOrder;

/**
 * Baut aus der Bestellung, die auf der Bestellbestätigungsseite angezeigt wird,
 * ein neutrales Datenpaket. Das JavaScript macht daraus anschließend die Formate
 * "Felix Ries", "Commerce4" und/oder "GA4".
 *
 * Es werden nur Werte übertragen, die der Kunde auf der Bestätigungsseite ohnehin sieht.
 * Einkaufspreise werden NICHT übertragen (die liefert Shoplytics separat über den COGS-Feed).
 */
class OrderDataBuilder
{
    /** Positionsarten, die als Artikel gezählt werden (siehe plentymarkets OrderItemType) */
    const ITEM_TYPES = [
        1,  // Variante
        2,  // Artikelpaket
        9,  // nicht zugeordnete Variante
        13  // Artikel-Set
    ];

    /** Positionsart Versandkosten */
    const TYPE_SHIPPING = 6;

    /** Positionsart Aktionsgutschein */
    const TYPE_PROMOTIONAL_COUPON = 4;

    /** Adress-Option "E-Mail" */
    const ADDRESS_OPTION_EMAIL = 5;

    /**
     * @param mixed $localizedOrder Objekt IO\Models\LocalizedOrder oder Array
     * @param bool $withCustomerData Kundendaten (E-Mail, PLZ, Ort, Land) mitsenden?
     * @return array|null
     */
    public function build($localizedOrder, $withCustomerData)
    {
        $data = $this->toArray($localizedOrder);
        if (!is_array($data) || !isset($data['order']) || !is_array($data['order'])) {
            return null;
        }

        $order = $data['order'];
        $orderId = isset($order['id']) ? (int)$order['id'] : 0;
        if ($orderId <= 0) {
            return null;
        }

        $totals = (isset($data['totals']) && is_array($data['totals'])) ? $data['totals'] : [];
        $variations = (isset($data['variations']) && is_array($data['variations'])) ? $data['variations'] : [];
        $orderAmount = $this->customerAmount(isset($order['amounts']) ? $order['amounts'] : []);

        // Artikelpositionen sammeln
        $items = [];
        $itemsQuantity = 0;
        $firstVatRate = 0;
        $calcItemSumGross = 0;
        $calcItemSumNet = 0;
        $calcShippingGross = 0;
        $calcShippingNet = 0;
        $couponGross = 0;
        $couponNet = 0;

        $orderItems = (isset($order['orderItems']) && is_array($order['orderItems'])) ? $order['orderItems'] : [];
        foreach ($orderItems as $orderItem) {
            if (!is_array($orderItem)) {
                continue;
            }
            $typeId = isset($orderItem['typeId']) ? (int)$orderItem['typeId'] : 0;
            $amount = $this->customerAmount(isset($orderItem['amounts']) ? $orderItem['amounts'] : []);
            $quantity = isset($orderItem['quantity']) ? (float)$orderItem['quantity'] : 0;
            $priceGross = isset($amount['priceGross']) ? (float)$amount['priceGross'] : 0;
            $priceNet = isset($amount['priceNet']) ? (float)$amount['priceNet'] : 0;

            if ($typeId === self::TYPE_SHIPPING) {
                $calcShippingGross += $priceGross;
                $calcShippingNet += $priceNet;
                continue;
            }

            // Aktionsgutschein: mindert den Warenwert (Beträge sind negativ)
            if ($typeId === self::TYPE_PROMOTIONAL_COUPON) {
                $couponGross += $priceGross * ($quantity > 0 ? $quantity : 1);
                $couponNet += $priceNet * ($quantity > 0 ? $quantity : 1);
                continue;
            }

            if (!in_array($typeId, self::ITEM_TYPES, true)) {
                continue;
            }

            $variationId = isset($orderItem['itemVariationId']) ? (int)$orderItem['itemVariationId'] : 0;
            $variation = $this->findVariation($variations, $variationId);
            $vatRate = isset($orderItem['vatRate']) ? (float)$orderItem['vatRate'] : 0;
            if ($firstVatRate === 0 && $vatRate > 0) {
                $firstVatRate = $vatRate;
            }

            $items[] = [
                'variationId' => $variationId,
                'itemId'      => (int)$this->value($variation, ['item', 'id'], 0),
                'number'      => (string)$this->value($variation, ['variation', 'number'], ''),
                'name'        => (string)(isset($orderItem['orderItemName']) ? $orderItem['orderItemName'] : ''),
                'brand'       => (string)$this->firstFilled([
                    $this->value($variation, ['item', 'manufacturer', 'externalName'], ''),
                    $this->value($variation, ['item', 'manufacturer', 'name'], '')
                ]),
                'variant'     => $this->attributeText($variation),
                'priceGross'  => round($priceGross, 2),
                'priceNet'    => round($priceNet, 2),
                'quantity'    => $quantity,
                'vatRate'     => $vatRate
            ];

            $itemsQuantity += $quantity;
            $calcItemSumGross += $priceGross * $quantity;
            $calcItemSumNet += $priceNet * $quantity;
        }

        $totalGross = $this->number($totals, 'totalGross', isset($orderAmount['grossTotal']) ? $orderAmount['grossTotal'] : 0);
        $totalNet = $this->number($totals, 'totalNet', isset($orderAmount['netTotal']) ? $orderAmount['netTotal'] : 0);
        $vatTotal = isset($orderAmount['vatTotal']) ? (float)$orderAmount['vatTotal'] : ($totalGross - $totalNet);

        /*
         * Warenwert: aus den Positionen selbst berechnet (tatsächlich berechnete Preise × Menge,
         * abzüglich Aktionsgutschein). Die Summen von plentyShop ("totals") rechnen Rabatte wieder
         * hinzu und ziehen Gutscheine nicht ab – das würde den Conversion-Wert zu hoch machen.
         * Nur wenn keine Artikelpositionen erkannt wurden, werden die plentyShop-Summen genutzt.
         */
        if (count($items)) {
            $itemSumGross = $calcItemSumGross + $couponGross;
            $itemSumNet = $calcItemSumNet + $couponNet;
        } else {
            $itemSumGross = $this->number($totals, 'itemSumGross', 0);
            $itemSumNet = $this->number($totals, 'itemSumNet', 0);
        }
        $couponValue = abs($couponGross) > 0 ? abs($couponGross) : abs($this->number($totals, 'couponValue', 0));

        $result = [
            'orderId'          => $orderId,
            'createdAt'        => (string)(isset($order['createdAt']) && !is_array($order['createdAt']) ? $order['createdAt'] : ''),
            'currency'         => (string)$this->firstFilled([
                isset($totals['currency']) ? $totals['currency'] : '',
                isset($orderAmount['currency']) ? $orderAmount['currency'] : '',
                'EUR'
            ]),
            'itemSumGross'     => round($itemSumGross, 2),
            'itemSumNet'       => round($itemSumNet, 2),
            'shippingGross'    => round($this->number($totals, 'shippingGross', $calcShippingGross), 2),
            'shippingNet'      => round($this->number($totals, 'shippingNet', $calcShippingNet), 2),
            'totalGross'       => round($totalGross, 2),
            'totalNet'         => round($totalNet, 2),
            'vatTotal'         => round($vatTotal, 2),
            'vatRate'          => $firstVatRate,
            'couponCode'       => (string)(isset($totals['couponCode']) ? $totals['couponCode'] : ''),
            'couponValue'      => round($couponValue, 2),
            'isNet'            => !empty($totals['isNet']),
            'paymentMethod'    => (string)(isset($data['paymentMethodName']) ? $data['paymentMethodName'] : ''),
            'shippingProvider' => (string)(isset($data['shippingProvider']) ? $data['shippingProvider'] : ''),
            'shippingProfile'  => (string)(isset($data['shippingProfileName']) ? $data['shippingProfileName'] : ''),
            'itemsQuantity'    => $itemsQuantity,
            'items'            => $items,
            'customer'         => [
                'contactId' => $this->contactId($order),
                'isGuest'   => $this->contactId($order) <= 0
            ]
        ];

        if ($withCustomerData) {
            $address = (isset($order['billingAddress']) && is_array($order['billingAddress'])) ? $order['billingAddress'] : [];
            $result['customer']['email'] = $this->addressEmail($address);
            $result['customer']['postalCode'] = (string)(isset($address['postalCode']) ? $address['postalCode'] : '');
            $result['customer']['town'] = (string)(isset($address['town']) ? $address['town'] : '');
            $result['customer']['countryIso2'] = (string)$this->value($address, ['country', 'isoCode2'], '');
            $result['customer']['countryName'] = (string)$this->value($address, ['country', 'name'], '');
        }

        return $result;
    }

    /**
     * LocalizedOrder (Objekt) in ein Array umwandeln.
     *
     * @param mixed $localizedOrder
     * @return array|null
     */
    private function toArray($localizedOrder)
    {
        $array = null;
        if (is_array($localizedOrder)) {
            $array = $localizedOrder;
        } elseif ($localizedOrder instanceof LocalizedOrder) {
            // Hinweis: method_exists() ist in plentymarkets-Plugins verboten, daher instanceof.
            $array = $localizedOrder->toArray();
        } elseif (is_object($localizedOrder)) {
            // Andere Objekte (z. B. die rohe Bestellung) über JSON in ein Array umwandeln
            $decoded = json_decode(json_encode($localizedOrder), true);
            $array = is_array($decoded) ? $decoded : null;
        }
        if (!is_array($array)) {
            return null;
        }

        /*
         * Auf der ShopBuilder-Bestellbestätigung übergibt plentyShop teils die ROHE Bestellung
         * (id, orderItems, amounts ...) statt der aufbereiteten Form ['order' => ..., 'totals' => ...].
         * (Festgestellt am 22.10.2026 auf lackier-bedarf.info.) Beide Formen werden unterstützt.
         */
        if (!isset($array['order']) && isset($array['id']) && isset($array['orderItems'])) {
            $array = ['order' => $array];
        }
        return $array;
    }

    /**
     * Betrag in Kundenwährung wählen (wie plentyShop selbst: nicht die Systemwährung bevorzugen).
     *
     * @param mixed $amounts
     * @return array
     */
    private function customerAmount($amounts)
    {
        if (!is_array($amounts) || !count($amounts)) {
            return [];
        }
        foreach ($amounts as $amount) {
            if (is_array($amount) && empty($amount['isSystemCurrency'])) {
                return $amount;
            }
        }
        $first = reset($amounts);
        return is_array($first) ? $first : [];
    }

    /**
     * Variantendaten (aus der Artikelsuche) zur Variante finden.
     *
     * @param array $variations
     * @param int $variationId
     * @return array
     */
    private function findVariation(array $variations, $variationId)
    {
        if (isset($variations[$variationId]) && is_array($variations[$variationId])) {
            return $variations[$variationId];
        }
        if (isset($variations[(string)$variationId]) && is_array($variations[(string)$variationId])) {
            return $variations[(string)$variationId];
        }
        return [];
    }

    /**
     * Verschachtelten Wert sicher auslesen.
     *
     * @param mixed $data
     * @param array $path
     * @param mixed $default
     * @return mixed
     */
    private function value($data, array $path, $default)
    {
        $current = $data;
        foreach ($path as $key) {
            if (!is_array($current) || !isset($current[$key])) {
                return $default;
            }
            $current = $current[$key];
        }
        return $current === null ? $default : $current;
    }

    /**
     * Ersten nicht leeren Wert zurückgeben.
     *
     * @param array $values
     * @return mixed
     */
    private function firstFilled(array $values)
    {
        foreach ($values as $value) {
            if ($value !== null && $value !== '' && !is_array($value)) {
                return $value;
            }
        }
        return '';
    }

    /**
     * Zahl aus einem Array holen, sonst Ersatzwert.
     *
     * @param array $data
     * @param string $key
     * @param float $fallback
     * @return float
     */
    private function number(array $data, $key, $fallback)
    {
        if (isset($data[$key]) && is_numeric($data[$key])) {
            return (float)$data[$key];
        }
        return (float)$fallback;
    }

    /**
     * Attributwerte als Text, z. B. "1,4 mm" oder "rot, Größe L".
     *
     * @param array $variation
     * @return string
     */
    private function attributeText(array $variation)
    {
        $attributes = $this->value($variation, ['attributes'], []);
        if (!is_array($attributes)) {
            return '';
        }
        $parts = [];
        foreach ($attributes as $attribute) {
            $name = $this->value($attribute, ['value', 'names', 'name'], '');
            if (is_string($name) && strlen($name)) {
                $parts[] = $name;
            }
        }
        return implode(', ', $parts);
    }

    /**
     * Kontakt-ID der Bestellung (0 = Gastbestellung).
     *
     * @param array $order
     * @return int
     */
    private function contactId(array $order)
    {
        $relations = (isset($order['relations']) && is_array($order['relations'])) ? $order['relations'] : [];
        foreach ($relations as $relation) {
            if (is_array($relation)
                && isset($relation['referenceType'])
                && $relation['referenceType'] === 'contact'
                && isset($relation['referenceId'])
                && (int)$relation['referenceId'] > 0) {
                return (int)$relation['referenceId'];
            }
        }
        return 0;
    }

    /**
     * E-Mail-Adresse aus der Rechnungsadresse.
     *
     * @param array $address
     * @return string
     */
    private function addressEmail(array $address)
    {
        $options = (isset($address['options']) && is_array($address['options'])) ? $address['options'] : [];
        foreach ($options as $option) {
            if (is_array($option)
                && isset($option['typeId'])
                && (int)$option['typeId'] === self::ADDRESS_OPTION_EMAIL
                && !empty($option['value'])) {
                return trim((string)$option['value']);
            }
        }
        return '';
    }
}
