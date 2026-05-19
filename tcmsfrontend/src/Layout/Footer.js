import React from 'react';
import { Typography } from 'antd';
import './Footer.css';

const { Text } = Typography;

const Footer = () => {
  return (
    <footer className="app-footer">
      <Text className="footer-copyright">
        © 2024 Hari's Tuition Center. All rights reserved.
      </Text>
    </footer>
  );
};

export default Footer;