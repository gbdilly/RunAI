import { Image } from 'react-native';

const logoCompleta = require('./assets/logo.png');

export default function LogoImagem({ largura = 260 }) {
  return (
    <Image
      source={logoCompleta}
      style={{ width: largura, height: largura }}
      resizeMode="contain"
    />
  );
}