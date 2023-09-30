import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import * as yup from 'yup';

export type ICharacterizationValues = {
    name?: string;
    profileName?: string;
    description?: string;
    type: CharacterizationTypeEnum;
    noiseValue?: string;
    temperature?: string;
    luminosity?: string;
    moisturePercentage?: string;
};

export const characterizationFromDefaultValues = {
    name: '',
    description: '',
    type: CharacterizationTypeEnum.ACTIVITIES,
    noiseValue: '',
    temperature: '',
    luminosity: '',
    moisturePercentage: '',
};

export const characterizationSchema = yup
    .object({
        name: yup.string().trim().required('Informe o nome.'),
        type: yup.string().required('Informe o tipo.'),
        description: yup.string().optional(),
    })
    .required();
