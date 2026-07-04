import React, { useState, useEffect } from "react";
import { Form, Input, Button, message } from "antd";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { apiUrl } from "../api";
import "./ResetPassword.css";

const ResetPassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!token || !email) {
      message.error("Invalid or expired reset link.");
      navigate("/login");
    }
  }, [token, email, navigate]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await api.post(
        '/api/auth/reset-password',
        {
          email: email,
          token: token,
          user_type: searchParams.get("type"),
          password: values.password,
          password_confirmation: values.password_confirmation,
        },
      );

      if (response.data.success) {
        setSuccess(true);
        message.success(response.data.message);
      } else {
        message.error(response.data.message || "Failed to reset password.");
      }
    } catch (error) {
      if (error.response) {
        message.error(
          error.response.data.message || "Failed to reset password",
        );
      } else {
        message.error("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <div className="reset-password-content">
        <div className="reset-password-box">
          {success ? (
            <div className="success-container">
              <div className="success-icon">✓</div>
              <h2 className="success-title">Password Reset Successful!</h2>
              <p className="success-message">
                Your password has been reset successfully.
              </p>
              <Button
                type="primary"
                block
                size="large"
                className="reset-password-button"
                onClick={() => navigate("/login")}
              >
                LOGIN NOW
              </Button>
            </div>
          ) : (
            <>
              <h1 className="reset-password-title">Reset Password</h1>
              <p className="reset-password-subtitle">
                Enter your new password below.
              </p>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                requiredMark={false}
              >
                <Form.Item
                  label="New Password"
                  name="password"
                  rules={[
                    {
                      required: true,
                      message: "Please enter your new password.",
                    },
                    {
                      min: 6,
                      message: "Password must be at least 6 characters.",
                    },
                  ]}
                >
                  <Input.Password
                    size="large"
                    placeholder="Enter new password"
                    iconRender={(visible) =>
                      visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                    }
                  />
                </Form.Item>

                <Form.Item
                  label="Confirm Password"
                  name="password_confirmation"
                  dependencies={["password"]}
                  rules={[
                    {
                      required: true,
                      message: "Please confirm your password.",
                    },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject("Passwords do not match!");
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    size="large"
                    placeholder="Confirm new password"
                    iconRender={(visible) =>
                      visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                    }
                  />
                </Form.Item>

                <Form.Item style={{ textAlign: "center", marginTop: 24 }}>
                  <Button
                    htmlType="submit"
                    className="reset-password-button"
                    loading={loading}
                    size="large"
                    block
                    style={{ color: "#ffffff" }}
                  >
                    RESET PASSWORD
                  </Button>
                </Form.Item>
              </Form>

              <div className="reset-password-footer">
                <Button type="link" onClick={() => navigate("/login")}>
                  Back to Login
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
