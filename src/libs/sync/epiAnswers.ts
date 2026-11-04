const booleanFields = ['efficientlyCheck', 'epcCheck', 'longPeriodsCheck', 'maintenanceCheck', 'sanitationCheck',
    'tradeSignCheck', 'trainingCheck', 'unstoppedCheck', 'validationCheck'] as const;

export type EpiAnswers = Partial<Record<typeof booleanFields[number], boolean | null>> & { lifeTimeInDays?: number | null };

/** Omission keeps an existing answer; false and explicit null are different data.
 * This whitelist also prevents form/HTTP metadata from becoming model fields.
 */
export function pickEpiAnswers(source: EpiAnswers): EpiAnswers {
    const result: EpiAnswers = {};
    for (const key of [...booleanFields, 'lifeTimeInDays'] as const) {
        if (source[key] !== undefined) Object.assign(result, { [key]: source[key] });
    }
    return result;
}
