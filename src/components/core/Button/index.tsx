import { Button as BT } from 'native-base';
import { IButtonProps } from 'native-base';
import { ColorType } from 'native-base/lib/typescript/components/types';

export type ISButtonProps = IButtonProps & {
    title: string;
    fontSize?: string | number;
    variant?: 'solid' | 'outline' | 'ghost';
    bg?: ColorType;
    bgPressed?: ColorType;
    addColor?: boolean;
    autoWidth?: boolean;
    color?: ColorType;
};
export const Button = BT;
