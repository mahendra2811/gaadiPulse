import { useState } from "react";
import { InputField } from "./index";
import { isDecimal } from "@/src/utils/formInput";
export function NumericValueField({
  label,
  value,
  onChange,
  scale = 3,
  signed = false,
  onValidityChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  scale?: number;
  signed?: boolean;
  onValidityChange?: (valid: boolean) => void;
}) {
  const [draft, setDraft] = useState({
    value,
    text: value === null ? "" : String(value),
  });
  const text =
    draft.value === value ? draft.text : value === null ? "" : String(value);
  return (
    <InputField
      label={label}
      optional
      value={text}
      keyboardType={scale ? "decimal-pad" : "number-pad"}
      numeric={{ scale, signed, wholeDigits: 15 }}
      onChangeText={(text) => {
        const valid = text === "" || isDecimal(text, { scale, signed });
        const number = text === "" ? null : valid ? Number(text) : value;
        setDraft({ value: number, text });
        onValidityChange?.(valid);
        if (valid) onChange(number);
      }}
    />
  );
}
