export function formatDateToDDMMYY(date?: Date) {
    if (!date) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Note: Months are zero-based
    const year = String(date.getFullYear()).slice(-2); // Extract last two digits of the year

    return `${day}/${month}/${year}`;
}
