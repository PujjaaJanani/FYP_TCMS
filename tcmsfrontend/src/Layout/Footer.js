// FooterBar.js
import { Layout } from 'antd';
const { Footer } = Layout;

function FooterBar() {
  return (
    <Footer
      style={{
        textAlign: 'center',
        padding: '16px 0',
        background: '#f0f2f5',
      }}
    >
      Hari's Tuition Center ©{new Date().getFullYear()} Created by InfintiX
    </Footer>
  );
}

export default Footer;