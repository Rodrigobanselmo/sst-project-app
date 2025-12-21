import * as yup from 'yup';

export const signInDefaultValues = {
    email: '',
    password: '',
};

export const signInSchema = yup
    .object({
        email: yup.string().required('Informe o e-mail.').email('E-mail inválido.'),
        password: yup.string().required('Informe a senha.').min(8, 'A senha deve ter pelo menos 8 dígitos.'),
    })
    .required();
