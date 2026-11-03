import { DateTimeInput } from "@/src/components/ui/fields";
import { ChoiceChip } from "@/src/components/ui/premium";
import { View, Switch } from "react-native";
import { AppText, InputField, AppButton, Card } from "@/src/components/ui";
import type { ProgressField } from "./schema";
import { r } from "@/src/features/records/copy";
type Props = {
  fields: ProgressField[];
  answers: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
  owner?: boolean;
  readOnly?: boolean;
};
export function DynamicFields({
  fields,
  answers,
  onChange,
  owner = false,
  readOnly = false,
}: Props) {
  return (
    <View style={{ gap: 16 }}>
      {fields
        .filter((field) => owner || field.visibility === "ALL")
        .map((field) => {
          const value = answers[field.id] ?? field.default_value;
          const toggleOption = (option: string) => {
            if (field.type === "select") {
              onChange(field.id, option);
              return;
            }
            const list = Array.isArray(value) ? value : [];
            onChange(
              field.id,
              list.includes(option)
                ? list.filter((v) => v !== option)
                : [...list, option],
            );
          };
          return (
            <Card key={field.id} style={{ padding: 14, gap: 8 }}>
              <AppText>
                {field.label}
                {field.required ? " *" : ""}
              </AppText>
              {!!field.helper && <AppText muted>{field.helper}</AppText>}
              {readOnly ? (
                <AppText>
                  {Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "boolean"
                      ? r(value ? "yes" : "no")
                      : String(value ?? "—")}
                </AppText>
              ) : ["boolean", "checkbox"].includes(field.type) ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <Switch
                    accessibilityLabel={field.label}
                    value={value === true}
                    onValueChange={(v) => onChange(field.id, v)}
                  />
                  <AppButton
                    secondary
                    label={r("no")}
                    onPress={() => onChange(field.id, false)}
                  />
                </View>
              ) : field.type === "select" || field.type === "multiselect" ? (
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {field.options.map((option) => (
                    <ChoiceChip
                      key={option}
                      label={option}
                      selected={
                        field.type === "select"
                          ? value === option
                          : Array.isArray(value) && value.includes(option)
                      }
                      onPress={() => toggleOption(option)}
                    />
                  ))}
                </View>
              ) : field.type === "date" || field.type === "time" ? (
                <DateTimeInput
                  label={field.label}
                  mode={field.type}
                  allowFuture
                  required={field.required}
                  optional={!field.required}
                  value={String(value ?? "")}
                  onChange={(text) => onChange(field.id, text)}
                />
              ) : (
                <InputField
                  label={field.label}
                  required={field.required}
                  optional={!field.required}
                  numeric={
                    ["integer", "decimal", "currency", "trip_count"].includes(
                      field.type,
                    )
                      ? {
                          scale: ["integer", "trip_count"].includes(field.type)
                            ? 0
                            : field.type === "currency"
                              ? 2
                              : 6,
                          signed: field.type !== "trip_count",
                          wholeDigits: 15,
                        }
                      : undefined
                  }
                  value={String(value ?? "")}
                  multiline={field.type === "paragraph"}
                  keyboardType={
                    ["integer", "decimal", "currency", "trip_count"].includes(
                      field.type,
                    )
                      ? "decimal-pad"
                      : "default"
                  }
                  onChangeText={(text) => onChange(field.id, text)}
                />
              )}
            </Card>
          );
        })}
    </View>
  );
}
