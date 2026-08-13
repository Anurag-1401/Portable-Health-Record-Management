package com.portable_health_record_system.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.NumericNode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class CanonicalJson {

    private final ObjectMapper objectMapper;

    public CanonicalJson(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String canonicalize(Object value) {
        return canonicalizeNode(objectMapper.valueToTree(value));
    }

    private String canonicalizeNode(JsonNode node) {
        if (node == null || node.isNull()) return "null";

        try {
            if (node.isTextual()) {
                return objectMapper.writeValueAsString(node.textValue());
            }

            if (node.isBoolean()) {
                return node.booleanValue() ? "true" : "false";
            }

            if (node.isNumber()) {
                return canonicalNumber((NumericNode) node);
            }

            if (node.isArray()) {
                ArrayNode array = (ArrayNode) node;
                List<String> values = new ArrayList<>(array.size());

                array.forEach(item -> values.add(canonicalizeNode(item)));

                return "[" + String.join(",", values) + "]";
            }

            if (node.isObject()) {
                ObjectNode object = (ObjectNode) node;
                List<String> keys = new ArrayList<>();

                object.fieldNames().forEachRemaining(keys::add);
                Collections.sort(keys);

                List<String> fields = new ArrayList<>(keys.size());

                for (String key : keys) {
                    fields.add(
                            objectMapper.writeValueAsString(key)
                                    + ":"
                                    + canonicalizeNode(object.get(key))
                    );
                }

                return "{" + String.join(",", fields) + "}";
            }

            return node.toString();

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Failed to canonicalize JSON",
                    e
            );
        }
    }

    private String canonicalNumber(NumericNode node) {
        BigDecimal value = node.decimalValue();

        if (value.compareTo(BigDecimal.ZERO) == 0) {
            return "0";
        }

        return value.stripTrailingZeros().toPlainString();
    }
}