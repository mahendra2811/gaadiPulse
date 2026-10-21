import { useState } from "react";
import { View,Platform } from "react-native";
import { AppText, Card, InputField,AppButton } from "./index";
import { t } from "@/src/lib/i18n";
import type { ReactNode } from "react";
export function NumberField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <InputField
      label={label}
      value={value}
      onChangeText={onChange}
      keyboardType="decimal-pad"
      error={error}
    />
  );
}
export function MoneyField({
  label,
  paise,
  onChange,
}: {
  label: string;
  paise: number | null;
  onChange: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState({
    paise,
    text: paise === null ? "" : (paise / 100).toFixed(2),
  });
  const text =
    draft.paise === paise
      ? draft.text
      : paise === null
        ? ""
        : (paise / 100).toFixed(2);
  return (
    <NumberField
      label={label}
      value={text}
      onChange={(value) => {
        if (!/^\d*(\.\d{0,2})?$/.test(value)) return;
        const next = value === "" ? null : Math.round(Number(value) * 100);
        setDraft({ paise: next, text: value });
        onChange(next);
      }}
    />
  );
}
export function DateTimeInput({value,onChange,error,label=t('observed'),allowFuture=false}:{value:string;onChange:(value:string)=>void;error?:string;label?:string;allowFuture?:boolean}){
 const [pickerError,setPickerError]=useState('');
 const choose=async()=>{try{if(Platform.OS!=='android')return;const {DateTimePickerAndroid}=await import('@react-native-community/datetimepicker');const current=value&&Number.isFinite(Date.parse(value))?new Date(value):new Date();DateTimePickerAndroid.open({value:current,mode:'date',maximumDate:allowFuture?undefined:new Date(),onChange:(event,date)=>{if(event.type!=='set'||!date)return;DateTimePickerAndroid.open({value:date,mode:'time',onChange:(timeEvent,time)=>{if(timeEvent.type==='set'&&time)onChange(time.toISOString());}});}});}catch(e){setPickerError(String(e));}};
 return <View style={{gap:8}}><InputField label={label} value={value} onChangeText={onChange} error={error||pickerError} autoCapitalize="none"/>{Platform.OS==='android'&&<AppButton secondary label={t('chooseDateTime')} onPress={()=>void choose()}/>}</View>;
}
export function MeterFields({
  mode,
  km,
  hours,
  onKm,
  onHours,
}: {
  mode: "KM" | "HOURS" | "BOTH";
  km: string;
  hours: string;
  onKm: (v: string) => void;
  onHours: (v: string) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      {mode !== "HOURS" && (
        <NumberField label={t("km")} value={km} onChange={onKm} />
      )}
      {mode !== "KM" && (
        <NumberField label={t("hours")} value={hours} onChange={onHours} />
      )}
    </View>
  );
}
export function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <AppText large>{title}</AppText>
      {children}
    </Card>
  );
}
export function PermissionGate({
  allowed,
  children,
  fallback,
}: {
  allowed: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return allowed ? (
    <>{children}</>
  ) : (
    <>{fallback ?? <AppText>{t("denied")}</AppText>}</>
  );
}
