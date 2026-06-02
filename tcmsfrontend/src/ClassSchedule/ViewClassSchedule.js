// src/Pages/ViewClassSchedule.js
import React, { useState, useEffect } from "react";
import {
  Table,
  Tag,
  Button,
  Modal,
  message,
  Typography,
  Card,
  Input,
  Flex,
  Select,
  Divider,
  Spin,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  BookOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  getToken,
  getUserType,
  getRole,
  isLoggedIn,
} from "../Utils/LocalStorage";
import { apiUrl } from "../api";
import Header from "../Layout/Header";

const { Title, Text } = Typography;
const { Option } = Select;

const ViewClassSchedule = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filterDay, setFilterDay] = useState("All");
  const [filterForm, setFilterForm] = useState("All");
  const [filterYear, setFilterYear] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();

  const userType = getUserType();
  const role = getRole();
  const token = getToken();
  const loggedIn = isLoggedIn();
  const isAdminOrStaff =
    userType === "authority" && (role === "Admin" || role === "Staff");

  // Fetch available years for filter
  const fetchAvailableYears = async () => {
    try {
      const res = await axios.get(
        apiUrl("/api/classes/available-years"),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.data.success) {
        // Convert years to numbers for proper comparison
        const yearsAsNumbers = res.data.data.map((y) => parseInt(y));
        setAvailableYears(yearsAsNumbers);
        // Set default to current year for admin/staff (ensure number type)
        if (isAdminOrStaff && yearsAsNumbers.length > 0) {
          const defaultYear = parseInt(res.data.current_year);
          setFilterYear(defaultYear);
        }
      }
    } catch (error) {
      console.error("Failed to fetch years:", error);
    }
  };

  const fetchClasses = async () => {
    setLoading(true);
    try {
      let url = apiUrl("/api/classes/schedule");

      // Add year filter for admin/staff
      if (isAdminOrStaff && filterYear) {
        url += `?year=${filterYear}`;
      }

      let res;
      if (loggedIn) {
        res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await axios.get(
          apiUrl("/api/classes/schedule/public"),
        );
      }

      if (res.data.success) {
        setClasses(res.data.data);
      } else {
        message.error(res.data.message || "Failed to load classes");
      }
    } catch (error) {
      console.error("Failed to load classes:", error);
      message.error("Failed to load classes");
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrStaff) {
      fetchAvailableYears();
    } else {
      fetchClasses();
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminOrStaff && filterYear !== null) {
      fetchClasses();
    }
  }, [filterYear]);

  const handleDelete = async (classId, classYear) => {
    // Ensure number comparison
    const yearAsNumber = parseInt(classYear);
    if (yearAsNumber !== currentYear) {
      message.warning("Cannot delete past year records");
      return;
    }

    Modal.confirm({
      title: "Delete Class",
      content: "Are you sure you want to delete this class?",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          const res = await axios.delete(
            apiUrl(`/api/classes/schedule/${classId}`),
            { headers: { Authorization: `Bearer ${getToken()}` } },
          );
          if (res.data.success) {
            message.success("Class deleted successfully");
            fetchClasses();
          }
        } catch (err) {
          message.error(
            err.response?.data?.message || "Failed to delete class",
          );
        }
      },
    });
  };

  const filteredClasses = classes.filter((c) => {
    const matchDay = filterDay === "All" || c.classDay === filterDay;
    const matchForm = filterForm === "All" || c.form === filterForm;
    const q = searchText.toLowerCase();
    const matchSearch =
      c.subjectName.toLowerCase().includes(q) ||
      (c.teacherName && c.teacherName.toLowerCase().includes(q));
    return matchDay && matchForm && matchSearch;
  });

  const groupedClasses = filteredClasses.reduce((groups, classItem) => {
    const form = classItem.form;
    if (!groups[form]) {
      groups[form] = [];
    }
    groups[form].push(classItem);
    return groups;
  }, {});

  const sortedForms = Object.keys(groupedClasses).sort((a, b) => {
    const formNumA = parseInt(a.replace("Form ", ""));
    const formNumB = parseInt(b.replace("Form ", ""));
    return formNumA - formNumB;
  });

  const dayColors = {
    Monday: "blue",
    Tuesday: "green",
    Wednesday: "orange",
    Thursday: "purple",
    Friday: "cyan",
    Saturday: "magenta",
    Sunday: "red",
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f7f5ff",
      margin: 0,
      padding: 0,
    },
    contentWrapper: {
      padding: "28px 32px",
      maxWidth: "1400px",
      margin: "0 auto",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
      flexWrap: "wrap",
      gap: 16,
    },
    filterBar: {
      marginBottom: 16,
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
    },
    classCard: {
      background: "#f5f0ff",
      border: "1px solid #d3adf7",
      borderRadius: 8,
      padding: 12,
    },
    formHeader: {
      margin: "24px 0 16px 0",
    },
    formTitle: {
      fontSize: 18,
      fontWeight: 500,
      color: "#3b1fa3",
    },
  };

  const columns = [
    {
      title: "Year",
      dataIndex: "academicYear",
      key: "academicYear",
      width: 80,
      render: (year) => (
        <Tag color={parseInt(year) === currentYear ? "green" : "blue"}>
          {year}
        </Tag>
      ),
    },
    {
      title: "Day",
      dataIndex: "classDay",
      width: 120,
      render: (day) => <Tag color={dayColors[day]}>{day}</Tag>,
    },
    {
      title: "Subject",
      key: "subject",
      width: 200,
      render: (_, c) => (
        <div>
          <div style={{ fontWeight: 600, color: "#3b1fa3" }}>
            {c.subjectName}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {c.form}
          </Text>
        </div>
      ),
    },
    {
      title: "Fee",
      dataIndex: "subjectFee",
      width: 100,
      render: (fee) => (
        <Tag color="gold" icon={<DollarOutlined />} style={{ fontWeight: 500 }}>
          RM {parseFloat(fee).toFixed(2)}
        </Tag>
      ),
    },
    {
      title: "Time",
      key: "time",
      width: 150,
      render: (_, c) => (
        <Flex align="center" gap={4}>
          <ClockCircleOutlined style={{ color: "#888" }} />
          <Text>
            {c.startTime} - {c.finishTime}
          </Text>
        </Flex>
      ),
    },
    {
      title: "Location",
      dataIndex: "location",
      width: 150,
      render: (loc) =>
        loc ? (
          <Flex align="center" gap={4}>
            <EnvironmentOutlined style={{ color: "#888" }} />
            <Text>{loc}</Text>
          </Flex>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Availability",
      key: "availability",
      width: 130,
      render: (_, c) => {
        const enrolled = c.enrolledStudents || 0;
        const isFull = enrolled >= c.availability;
        const isAlmostFull = enrolled >= c.availability * 0.8;
        const availableSpaces = c.availability - enrolled;

        return (
          <Flex align="center" gap={4} wrap="wrap">
            <Tag color={isFull ? "red" : isAlmostFull ? "orange" : "green"}>
              {enrolled}/{c.availability}
            </Tag>
            {!isFull && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({availableSpaces} left)
              </Text>
            )}
            {isFull && (
              <Tag color="red" style={{ fontSize: 11 }}>
                Full
              </Tag>
            )}
          </Flex>
        );
      },
    },
    {
      title: "Teacher",
      dataIndex: "teacherName",
      width: 150,
      render: (name) => name || <Text type="secondary">Not Assigned</Text>,
    },
    ...(isAdminOrStaff
      ? [
          {
            title: "Actions",
            key: "actions",
            width: 240,
            render: (_, c) => {
              // Ensure numeric comparison
              const isPastYear = parseInt(c.academicYear) !== currentYear;
              if (isPastYear) {
                return (
                  <Flex gap={8} wrap="wrap">
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() =>
                        navigate(`/staff/attendance/archive/${c.classId}`, {
                          state: {
                            classInfo: c,
                            academicYear: c.academicYear,
                            classColor: "#3b1fa3",
                          },
                        })
                      }
                    >
                      Attendance
                    </Button>
                    <Button
                      size="small"
                      icon={<BookOutlined />}
                      onClick={() =>
                        navigate(`/staff/class-archive/${c.classId}`, {
                          state: {
                            classInfo: c,
                            academicYear: c.academicYear,
                            classColor: "#3b1fa3",
                          },
                        })
                      }
                    >
                      Materials & Tests
                    </Button>
                  </Flex>
                );
              }

              return (
                <Flex gap={8}>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() =>
                      navigate(`/authority/schedule/edit/${c.classId}`)
                    }
                    disabled={false}
                    title="Edit"
                  />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(c.classId, c.academicYear)}
                    disabled={false}
                    title="Delete"
                  />
                </Flex>
              );
            },
          },
        ]
      : []),
  ];

  if (pageLoading) {
    return (
      <div
        style={{
          padding: "24px",
          height: "100vh",
          width: "100%",
          background: "#f7f5ff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Only show Header when user is NOT logged in (public view) */}
      {!loggedIn && <Header />}

      <div style={styles.contentWrapper}>
        <div style={styles.header}>
          <Flex align="center" gap={16}>
            <Title level={3} style={{ margin: 0, color: "#3b1fa3" }}>
              Class Schedule
            </Title>
          </Flex>
          <Flex gap={8} wrap="wrap">
            {isAdminOrStaff && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate("/authority/schedule/add")}
                style={{ background: "#52c41a", borderColor: "#52c41a" }}
                // IMPORTANT: Compare numbers, not strings
                disabled={filterYear !== currentYear}
                title={
                  filterYear !== currentYear
                    ? "Can only add classes for current year"
                    : "Add Class"
                }
              >
                Add Class
              </Button>
            )}
          </Flex>
        </div>

        <div style={styles.filterBar}>
          {/* Year Filter - Only for Admin/Staff */}
          {isAdminOrStaff && availableYears.length > 0 && (
            <Select
              value={filterYear}
              onChange={setFilterYear}
              style={{ width: 130 }}
              placeholder="Select Year"
            >
              {availableYears.map((year) => (
                <Option key={year} value={year}>
                  {year} {year === currentYear}
                </Option>
              ))}
            </Select>
          )}

          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by subject or teacher…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ width: 250 }}
          />
          <Select
            value={filterDay}
            onChange={setFilterDay}
            style={{ width: 140 }}
          >
            <Option value="All">All Days</Option>
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((d) => (
              <Option key={d} value={d}>
                {d}
              </Option>
            ))}
          </Select>
          <Select
            value={filterForm}
            onChange={setFilterForm}
            style={{ width: 140 }}
          >
            <Option value="All">All Forms</Option>
            {["Form 1", "Form 2", "Form 3", "Form 4", "Form 5"].map((f) => (
              <Option key={f} value={f}>
                {f}
              </Option>
            ))}
          </Select>
        </div>

        <Card>
          {sortedForms.length > 0 ? (
            sortedForms.map((form, index) => (
              <div key={form}>
                {index > 0 && <Divider style={{ margin: "24px 0 16px 0" }} />}
                <div style={styles.formHeader}>
                  <Text style={styles.formTitle}>{form}</Text>
                </div>
                <Table
                  dataSource={groupedClasses[form]}
                  columns={columns}
                  rowKey="classId"
                  loading={loading}
                  pagination={false}
                  scroll={{ x: 1200 }}
                  style={{
                    marginBottom: index === sortedForms.length - 1 ? 0 : 24,
                  }}
                  locale={{
                    emptyText: loading ? "Loading..." : "No classes found",
                  }}
                />
              </div>
            ))
          ) : (
            <div
              style={{ textAlign: "center", padding: "40px 0", color: "#999" }}
            >
              No classes found matching your filters.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ViewClassSchedule;
