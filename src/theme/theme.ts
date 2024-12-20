import { extendTheme } from 'native-base';

export const THEME = extendTheme({
    colors: {
        primary: {
            extraLight: '#fca557',
            light: '#f28338',
            main: '#F27329',
            dark: '#d9560b',
            extraDark: '#93421a',
        },
        green: {
            700: '#00875F',
            500: '#00B37E',
        },
        gray: {
            700: '#121214',
            600: '#202024',
            500: '#29292E',
            400: '#323238',
            300: '#7C7C8A',
            200: '#C4C4CC',
            100: '#E1E1E6',
            50: '#ebebf0',
        },
        info: {
            main: '#4559c9',
            light: '#899ed1',
        },
        status: {
            error: '#F44336',
        },
        background: {
            paper: '#ffffff',
            default: '#fbfbfb',
        },
        input: {
            paper: '#ebf0f0',
            paper_focus: '#dddee2',
        },
        text: {
            main: '#121214',
            label: '#63636f',
            light: '#7C7C8A',
            placeholder: '#7C7C8A',
            disabled: '#3d62ba',
        },
        border: {
            main: '#dddee2',
        },
        risk: {
            fis: '#1ca846',
            bio: '#933d15',
            qui: '#fa0215',
            erg: '#9c9507',
            aci: '#3d62ba',
            outros: '#2D3748',
            all: '#fff',
        },
        scale: {
            low: '#3cbe7d',
            mediumLow: '#8fa728',
            medium: '#d9d10b',
            mediumHigh: '#d96c2f',
            high: '#F44336',
        },
        white: '#FFFFFF',
        red: {
            500: '#F75A68',
        },
    },
    fonts: {
        heading: 'Roboto_700Bold',
        body: 'Roboto_400Regular',
    },
    fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
    },
    space: {
        pagePadding: 4,
        pagePaddingPx: 16,
    },
    sizes: {
        14: 56,
        33: 148,
    },
});
