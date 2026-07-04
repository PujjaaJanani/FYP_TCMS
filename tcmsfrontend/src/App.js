// App.js
import React from 'react';
import { Layout } from 'antd';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ContentArea from './Layout/ContentArea';
import './App.css';


const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Layout style={{ height: '100vh', overflow: 'hidden' }}>
          <ContentArea />
        </Layout>
      </AuthProvider>
    </Router>
  );
};

export default App;