import React, { useMemo, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { brazilianToDate, dateToBrazilian, todayDate } from './visitDates';
export { brazilianToDate, dateToBrazilian, todayDate } from './visitDates';
const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** A local calendar keeps date entry available offline and adds no native dependency. */
export function VisitDateInput({ value, onChange, label }: { value: string; onChange(value: string): void; label: string }) {
    const [calendar, setCalendar] = useState(false);
    const selected = brazilianToDate(value);
    const [month, setMonth] = useState(() => (selected || todayDate()).slice(0, 7));
    const [year, monthNumber] = month.split('-').map(Number);
    const cells = useMemo(() => {
        const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
        const days = new Date(year, monthNumber, 0).getDate();
        return [...Array(firstWeekday).fill(undefined), ...Array.from({ length: days }, (_, index) => index + 1)];
    }, [year, monthNumber]);
    const changeMonth = (delta: number) => {
        const next = new Date(year, monthNumber - 1 + delta, 1);
        if (next.getFullYear() < 1900 || next.getFullYear() > 2200) return;
        setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    };
    return <View>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputRow}>
            <TextInput testID="visit-effective-date" accessibilityLabel={label} value={value} onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, 8);
                onChange([digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/'));
            }} keyboardType="number-pad" placeholder="DD/MM/AAAA" placeholderTextColor="#718299" maxLength={10} style={styles.input} />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={calendar ? 'Fechar calendário' : 'Escolher data no calendário'}
                accessibilityState={{ expanded: calendar }} onPress={() => {
                    Keyboard.dismiss();
                    if (!calendar) setMonth((selected || todayDate()).slice(0, 7));
                    setCalendar(!calendar);
                }} style={styles.calendarButton}><Text style={styles.calendarIcon}>▦</Text></TouchableOpacity>
        </View>
        {calendar && <View style={styles.calendar}>
            <View style={styles.calendarHeader}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => changeMonth(-1)} style={styles.monthButton}><Text style={styles.arrow}>‹</Text></TouchableOpacity>
                <Text style={styles.monthName}>{monthNames[monthNumber - 1]} de {year}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => changeMonth(1)} style={styles.monthButton}><Text style={styles.arrow}>›</Text></TouchableOpacity>
            </View>
            <View style={styles.calendarGrid}>
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <View key={`week-${index}`} style={styles.weekday}><Text style={styles.weekdayText}>{day}</Text></View>)}
                {cells.map((day: number | undefined, index) => {
                    const iso = day ? `${month}-${String(day).padStart(2, '0')}` : '';
                    return day ? <TouchableOpacity key={iso} accessibilityRole="button" accessibilityLabel={`${day} de ${monthNames[monthNumber - 1]} de ${year}`}
                        accessibilityState={{ selected: selected === iso }} onPress={() => { onChange(dateToBrazilian(iso)); setCalendar(false); }}
                        style={[styles.day, selected === iso && styles.selectedDay]}><Text style={[styles.dayText, selected === iso && styles.selectedDayText]}>{day}</Text></TouchableOpacity> : <View key={`empty-${index}`} style={styles.day} />;
                })}
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={() => { onChange(dateToBrazilian(todayDate())); setCalendar(false); }} style={styles.todayButton}><Text style={styles.todayText}>Usar a data de hoje</Text></TouchableOpacity>
        </View>}
    </View>;
}
const styles = StyleSheet.create({
    label: { color: '#334d65', fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 8 },
    inputRow: { borderWidth: 1, borderColor: '#bacbda', borderRadius: 10, minHeight: 52, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff' },
    input: { flex: 1, minHeight: 52, padding: 14, fontSize: 16, color: '#203f5a' }, calendarButton: { width: 52, minHeight: 52, alignItems: 'center', justifyContent: 'center' }, calendarIcon: { color: '#315e81', fontSize: 24 },
    calendar: { marginTop: 10, padding: 8, borderWidth: 1, borderColor: '#d7e2ec', borderRadius: 12, backgroundColor: '#f7fafc' },
    calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, monthButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, arrow: { fontSize: 30, color: '#315e81' },
    monthName: { fontSize: 14, fontWeight: '600', color: '#31516c' }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.2857%', height: 28, alignItems: 'center', justifyContent: 'center' }, weekdayText: { fontSize: 12, color: '#708399' },
    day: { width: '14.2857%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, dayText: { fontSize: 15, color: '#31516c' }, selectedDay: { backgroundColor: '#254b70' }, selectedDayText: { color: '#fff', fontWeight: '700' },
    todayButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 5 }, todayText: { color: '#315e81', fontSize: 13, fontWeight: '600' },
});
