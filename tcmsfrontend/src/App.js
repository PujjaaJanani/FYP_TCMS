// App.js
import React from 'react';
import { Layout } from 'antd';
import { BrowserRouter as Router } from 'react-router-dom';
import ContentArea from './Layout/ContentArea';
import './App.css';

const App = () => {
  return (
    <Router>
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        <ContentArea />
      </Layout>
    </Router>
  );
};

export default App;