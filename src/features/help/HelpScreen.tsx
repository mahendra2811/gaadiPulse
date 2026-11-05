import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Screen, AppText, Card } from "@/src/components/ui";
import { useTheme } from "@/src/lib/theme";
import { helpSections } from "./content";
export default function HelpScreen() {
  const theme = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Screen title="Help" compact>
      <AppText muted>
        Practical answers for recording and sharing vehicle information.
        Available actions depend on your vehicle role and permissions.
      </AppText>
      {helpSections.map((section) => (
        <Card key={section.title} style={{ padding: 16 }}>
          <AppText large>{section.title}</AppText>
          {section.questions.map((item) => {
            const expanded = open === item.question;
            return (
              <View
                key={item.question}
                style={{ borderBottomWidth: 1, borderColor: theme.line }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.question}
                  accessibilityState={{ expanded }}
                  onPress={() => setOpen(expanded ? null : item.question)}
                  style={{
                    minHeight: 48,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: theme.ink,
                      fontWeight: "600",
                      fontSize: 15,
                    }}
                  >
                    {item.question}
                  </Text>
                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={19}
                    color={theme.muted}
                  />
                </Pressable>
                {expanded && (
                  <Text
                    style={{
                      color: theme.muted,
                      lineHeight: 21,
                      paddingBottom: 14,
                    }}
                  >
                    {item.answer}
                  </Text>
                )}
              </View>
            );
          })}
        </Card>
      ))}
    </Screen>
  );
}
