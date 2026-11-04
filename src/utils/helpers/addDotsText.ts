interface IProps {
    text?: string | null;
    maxLength: number;
}

export function addDotsText({ text, maxLength }: IProps) {
    // Optional API labels (for example company fantasy/workspace description) can be null.
    text = text ?? '';
    let result = text;

    if (text.length > maxLength) {
        result = text.substring(0, maxLength) + '...';
    }

    return result;
}
