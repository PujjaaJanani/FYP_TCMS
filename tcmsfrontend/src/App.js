// App.js
import React from 'react';
import { Layout } from 'antd';
import { BrowserRouter as Router } from 'react-router-dom';
import ContentArea from './Layout/ContentArea';
import './App.css';

const App = () => {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <ContentArea />
      </Layout>
    </Router>
  );
};

export default App;