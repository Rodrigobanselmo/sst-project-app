interface IProps {
    text: string;
    maxLength: number;
}

export function addDotsText({ text, maxLength }: IProps) {
    let result = text;

    if (text.length > maxLength) {
        result = text.substring(0, maxLength) + '...';
    }

    return result;
}
