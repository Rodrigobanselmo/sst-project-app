/** Formatting a civil date never converts it through the phone's timezone. */
export function dateToBrazilian(value?: string): string {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}
export function brazilianToDate(value: string): string | undefined {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return undefined;
    const [, day, month, year] = match;
    const result = `${year}-${month}-${day}`;
    const parsed = new Date(`${result}T12:00:00Z`);
    return Number(year) >= 1900 && Number(year) <= 2200 && !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === result ? result : undefined;
}
export function todayDate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
