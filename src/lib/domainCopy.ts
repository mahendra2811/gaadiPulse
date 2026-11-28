import { en, t } from "./i18n";

export const domainCopy = new Proxy(en.validation, {
  get: (_target, key) =>
    typeof key === "string" ? t(`validation.${key}` as TranslationKeyPath) : undefined,
});
export function validationText(key: keyof typeof domainCopy) {
  return t(`validation.${String(key)}` as TranslationKeyPath);
}
type TranslationKeyPath = `validation.${keyof typeof en.validation & string}`;
