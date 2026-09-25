
import API_URL from "./api";
import Register from "./register";
import {
  useEffect,
  useRef,
  useState
} from "react";
import Login from "./login";
import VerifyEmail from "./VerifyEmail";
import ForgotPassword from "./ForgotPassword";
import VerifyResetOTP from "./VerifyResetOTP";
import ResetPassword from "./ResetPassword";

import { GoogleOAuthProvider } from "@react-oauth/google";

import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );
const userProfileRef = useRef(null);
const timePickerRef = useRef(null);
useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      userProfileRef.current &&
      !userProfileRef.current.contains(
        event.target
      )
    ) {
      setShowUserMenu(false);
    }

    if (
      timePickerRef.current &&
      !timePickerRef.current.contains(
        event.target
      )
    ) {
      setShowTimePicker(false);
    }
  };

  document.addEventListener(
    "mousedown",
    handleClickOutside
  );

  return () => {
    document.removeEventListener(
      "mousedown",
      handleClickOutside
    );
  };
}, []);
  const [authPage, setAuthPage] = useState("login");
  const [verificationEmail, setVerificationEmail] =
    useState("");

  const [resetEmail, setResetEmail] =
    useState("");

  const [resetToken, setResetToken] =
    useState("");

  // USER PROFILE
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  const [showUserMenu, setShowUserMenu] =
    useState(false);

  const [time, setTime] = useState("");
  const [task, setTask] = useState("");

  const [showTimePicker, setShowTimePicker] =
    useState(false);

  const [pickerHour, setPickerHour] =
    useState("12");

  const [pickerMinute, setPickerMinute] =
    useState("00");

  const [pickerPeriod, setPickerPeriod] =
    useState("AM");
  const [tasks, setTasks] = useState([]);

  const [selectedTask, setSelectedTask] =
    useState(null);

  const [selectedDate, setSelectedDate] = useState(
    localStorage.getItem("selectedDate") ||
      new Date().toISOString().split("T")[0]
  );

  const [timeFormat, setTimeFormat] = useState(
    localStorage.getItem("timeFormat") || "12"
  );

  const [progressView, setProgressView] =
    useState("bar");

  const [showProgressMenu, setShowProgressMenu] =
    useState(false);

  const [pageAnimation, setPageAnimation] =
    useState("");

  // SAVE SELECTED DATE
  useEffect(() => {
    localStorage.setItem(
      "selectedDate",
      selectedDate
    );
  }, [selectedDate]);

  // SAVE TIME FORMAT
  useEffect(() => {
    localStorage.setItem(
      "timeFormat",
      timeFormat
    );
  }, [timeFormat]);

  // GET TASKS FROM BACKEND
  useEffect(() => {
    if (!isLoggedIn) {
      setTasks([]);
      return;
    }

    const token = localStorage.getItem("token");

    fetch(`${API_URL}/api/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          setUser(null);
          setIsLoggedIn(false);

          return null;
        }

        return response.json();
      })
      .then((data) => {
        if (data) {
          setTasks(data);
        }
      })
      .catch((error) => {
        console.log(
          "Error fetching tasks:",
          error
        );
      });
  }, [isLoggedIn]);

  const filteredTasks = tasks.filter(
    (item) => item.date === selectedDate
  );

  const completedTasks = filteredTasks.filter(
    (item) => item.status === "Completed"
  );

  const percentage =
    filteredTasks.length === 0
      ? 0
      : Math.round(
          (completedTasks.length /
            filteredTasks.length) *
            100
        );

  const formatTime = (value) => {
    const [hourText, minuteText = "00"] =
      value.split(":");

    const hour = Number(hourText);
    const minute = minuteText
      .slice(0, 2)
      .padStart(2, "0");

    if (timeFormat === "24") {
      return (
        hourText.padStart(2, "0") +
        ":" +
        minute
      );
    }

    let hour12 = hour % 12;

    if (hour12 === 0) {
      hour12 = 12;
    }

    const ampm = hour >= 12 ? "PM" : "AM";

    return (
      hour12 +
      ":" +
      minute +
      " " +
      ampm
    );
  };

  const openTimePicker = () => {
    const sourceTime = time || "12:00";
    const [hourText, minuteText = "00"] =
      sourceTime.split(":");

    const hour = Number(hourText);
    const minute = minuteText
      .slice(0, 2)
      .padStart(2, "0");

    setPickerMinute(minute);

    if (timeFormat === "24") {
      setPickerHour(
        String(hour).padStart(2, "0")
      );
    } else {
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;

      setPickerHour(String(hour12));
      setPickerPeriod(period);
    }

    setShowTimePicker(
      (current) => !current
    );
  };

  const applyPickedTime = () => {
    if (timeFormat === "24") {
      setTime(
        pickerHour + ":" + pickerMinute
      );
    } else {
      let hour = Number(pickerHour);

      if (
        pickerPeriod === "AM" &&
        hour === 12
      ) {
        hour = 0;
      }

      if (
        pickerPeriod === "PM" &&
        hour !== 12
      ) {
        hour += 12;
      }

      setTime(
        String(hour).padStart(2, "0") +
        ":" +
        pickerMinute
      );
    }

    setShowTimePicker(false);
  };

  const selectedDateText = new Date(
    selectedDate + "T00:00:00"
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const today = new Date()
    .toISOString()
    .split("T")[0];

  const getEmptyMessage = () => {
    if (selectedDate < today) {
      return "No task added on this date";
    }

    if (selectedDate > today) {
      return "No task scheduled for this date";
    }

    return "No tasks yet";
  };

  const getEmptyDescription = () => {
    if (selectedDate < today) {
      return "You didn't add any task for this day.";
    }

    if (selectedDate > today) {
      return "Your schedule is empty for this day.";
    }

    return "Add something you want to accomplish today.";
  };

  // ADD TASK
  const addTask = async () => {
    if (
      time === "" ||
      task.trim() === ""
    ) {
      alert("Please enter time and task");
      return;
    }

    const newTask = {
      task: task.trim(),
      time: time,
      date: selectedDate,
      status: "Pending",
    };

    try {
      const response = await fetch(
       `${API_URL}/api/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "token"
            )}`,
          },
          body: JSON.stringify(newTask),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add task");
      }

      const savedTask =
        await response.json();

      const taskToAdd = {
        ...savedTask,
        task: savedTask.task || newTask.task,
        time: savedTask.time || newTask.time,
        date: String(savedTask.date || newTask.date).slice(0, 10),
        status: savedTask.status || newTask.status,
      };

      setTasks((currentTasks) => [
        ...currentTasks,
        taskToAdd,
      ]);

      setTime("");
      setTask("");
    } catch (error) {
      console.log(
        "Error adding task:",
        error
      );
    }
  };

  // DELETE TASK
  const deleteTask = async () => {
    if (!selectedTask) return;

    const taskId = selectedTask;
    const previousTasks = tasks;

    setTasks((currentTasks) =>
      currentTasks.filter(
        (item) => item.id !== taskId
      )
    );
    setSelectedTask(null);

    try {
      const response = await fetch(
        `${API_URL}/api/tasks/${taskId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "token"
            )}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to delete task"
        );
      }
    } catch (error) {
      console.log(
        "Error deleting task:",
        error
      );

      setTasks(previousTasks);
    }
  };

  // TOGGLE TASK
  const toggleTask = async (id) => {
    const currentTask = tasks.find(
      (item) => item.id === id
    );

    if (!currentTask) return;

    const previousStatus = currentTask.status;

    const newStatus =
      previousStatus === "Completed"
        ? "Pending"
        : "Completed";

    // Update the UI immediately.
    setTasks((currentTasks) =>
      currentTasks.map((item) =>
        item.id === id
          ? {
              ...item,
              status: newStatus,
            }
          : item
      )
    );

    try {
      const response = await fetch(
        `${API_URL}/api/tasks/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "token"
            )}`,
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to update task"
        );
      }
    } catch (error) {
      console.log(
        "Error updating task:",
        error
      );

      // Roll back if the server update failed.
      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === id
            ? {
                ...item,
                status: previousStatus,
              }
            : item
        )
      );
    }
  };

  // CHANGE DATE
  const changeDate = (newDate) => {
    if (
      !newDate ||
      newDate === selectedDate
    ) {
      return;
    }

    if (newDate > selectedDate) {
      setPageAnimation(
        "page-from-right"
      );
    } else {
      setPageAnimation(
        "page-from-left"
      );
    }

    setSelectedDate(newDate);
    setSelectedTask(null);

    setTimeout(() => {
      setPageAnimation("");
    }, 650);
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setTasks([]);
    setSelectedTask(null);

    setUser(null);
    setShowUserMenu(false);

    setIsLoggedIn(false);
    setAuthPage("login");
  };

  // USER DISPLAY NAME
  const displayName =
    user?.name ||
    user?.email ||
    "User";

  const userInitial =
    displayName.charAt(0).toUpperCase();

  // =========================
  // AUTH SCREENS
  // =========================

  if (!isLoggedIn) {
    if (authPage === "register") {
      return (
        <Register
          onRegisterSuccess={(email) => {
            setVerificationEmail(email);
            setAuthPage("verify-email");
          }}
          onBackToLogin={() =>
            setAuthPage("login")
          }
        />
      );
    }

    if (authPage === "verify-email") {
      return (
        <VerifyEmail
          email={verificationEmail}
          onVerified={() => {
            setVerificationEmail("");
            setAuthPage("login");
          }}
          onBackToRegister={() =>
            setAuthPage("register")
          }
        />
      );
    }

    if (authPage === "forgot-password") {
      return (
        <ForgotPassword
          onOTPRequested={(email) => {
            setResetEmail(email);
            setAuthPage("verify-reset-otp");
          }}
          onBackToLogin={() =>
            setAuthPage("login")
          }
        />
      );
    }

    if (authPage === "verify-reset-otp") {
      return (
        <VerifyResetOTP
          email={resetEmail}
          onVerified={(token) => {
            setResetToken(token);
            setAuthPage("reset-password");
          }}
          onBackToForgotPassword={() =>
            setAuthPage("forgot-password")
          }
        />
      );
    }

    if (authPage === "reset-password") {
      return (
        <ResetPassword
          email={resetEmail}
          resetToken={resetToken}
          onResetSuccess={() => {
            setResetEmail("");
            setResetToken("");
            setAuthPage("login");
          }}
        />
      );
    }

    return (
      <Login
        onLogin={(userData) => {
          if (userData) {
            setUser(userData);

            localStorage.setItem(
              "user",
              JSON.stringify(userData)
            );
          }

          setIsLoggedIn(true);
        }}
        onRegister={() =>
          setAuthPage("register")
        }
        onForgotPassword={() =>
          setAuthPage("forgot-password")
        }
      />
    );
  }

  // =========================
  // TODO APP
  // =========================

  return (
    <div className="app">

      {/* HEADER */}

      <header className="app-header">

        <h1>TODO</h1>

        <p>Plan less. Finish more.</p>

      </header>

      {/* NOTEBOOK */}

      <div
        className={`notebook ${pageAnimation}`}
      >

        {/* MAIN TODO CARD */}

        <div className="todo-card">

          {/* DATE + PROGRESS */}

          <div
            className={"card-top" + (showUserMenu ? " profile-menu-open" : "")}
          >

            <div className="selected-date">
              {selectedDateText}
            </div>

            <div className="progress-area">

              {progressView === "bar" ? (
                <div className="progress-wrapper">

                  <div className="progress-track">

                    <div
                      className="progress-fill"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />

                  </div>

                  <span>
                    {percentage}%
                  </span>

                </div>
              ) : (
                <div
                  className="progress-circle"
                  style={{
                    "--progress": `${percentage * 3.6}deg`,
                  }}
                >
                  <div className="progress-circle-inner">
                    {percentage}%
                  </div>
                </div>
              )}

              {/* PROGRESS MENU */}

              <div className="progress-menu-wrapper">

                <button
                  className="progress-arrow"
                  onClick={() =>
                    setShowProgressMenu(
                      !showProgressMenu
                    )
                  }
                >
                  ▼
                </button>

                {showProgressMenu && (
                  <div className="progress-menu">

                    <button
                      onClick={() => {
                        setProgressView("bar");
                        setShowProgressMenu(false);
                      }}
                    >
                      Progress Bar
                    </button>

                    <button
                      onClick={() => {
                        setProgressView("circle");
                        setShowProgressMenu(false);
                      }}
                    >
                      Progress Circle
                    </button>

                  </div>
                )}

              </div>

              {/* USER PROFILE */}

              <div
                className="profile-progress-wrapper"
                ref={userProfileRef}
              >

                <button
                  className="profile-progress-button"
                  type="button"
                  onClick={() =>
                    setShowUserMenu(!showUserMenu)
                  }
                  aria-label="Open profile menu"
                  aria-expanded={showUserMenu}
                >
                  <div className="user-avatar">
                    {userInitial}
                  </div>

                </button>

                {showUserMenu && (
                  <div className="user-menu">
                    <div className="user-menu-greeting">
                      Hi, {displayName} 👋
                    </div>

                    <div className="user-menu-divider" />

                    <button
                      className="user-logout-button"
                      type="button"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}

              </div>

            </div>

          </div>

          {/* TABLE HEADER */}

          <div className="table-header">
            <div>TIME</div>
            <div>TASK</div>
            <div>STATUS</div>
          </div>

          {/* NEW TASK */}

          <div className="add-row">

            <div
              className="time-picker-wrap"
              ref={timePickerRef}
            >
              <button
                className="time-picker-button"
                type="button"
                onClick={openTimePicker}
              >
                <span className="time-picker-icon">
                  ◷
                </span>

                <span>
                  {time
                    ? formatTime(time)
                    : "Select time"}
                </span>

                <span className="time-picker-chevron">
                  {showTimePicker ? "▲" : "▼"}
                </span>
              </button>

              {showTimePicker && (
                <div className="time-picker-popover">
                  <div className="time-picker-title">
                    Select time
                  </div>

                  <div className="time-picker-fields">
                    <select
                      value={pickerHour}
                      onChange={(e) =>
                        setPickerHour(e.target.value)
                      }
                      aria-label="Hour"
                    >
                      {(timeFormat === "24"
                        ? Array.from(
                            { length: 24 },
                            (_, index) =>
                              String(index).padStart(2, "0")
                          )
                        : Array.from(
                            { length: 12 },
                            (_, index) =>
                              String(index + 1)
                          )
                      ).map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>

                    <span className="time-picker-colon">
                      :
                    </span>

                    <select
                      value={pickerMinute}
                      onChange={(e) =>
                        setPickerMinute(e.target.value)
                      }
                      aria-label="Minute"
                    >
                      {Array.from(
                        { length: 60 },
                        (_, index) =>
                          String(index).padStart(2, "0")
                      ).map((minute) => (
                        <option
                          key={minute}
                          value={minute}
                        >
                          {minute}
                        </option>
                      ))}
                    </select>

                    {timeFormat === "12" && (
                      <select
                        value={pickerPeriod}
                        onChange={(e) =>
                          setPickerPeriod(e.target.value)
                        }
                        aria-label="AM or PM"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    )}
                  </div>

                  <button
                    className="time-picker-done"
                    type="button"
                    onClick={applyPickedTime}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            <div>
              <input
                type="text"
                placeholder="Create a task...."
                value={task}
                onChange={(e) =>
                  setTask(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter"
                  ) {
                    addTask();
                  }
                }}
              />
            </div>

            <div></div>

          </div>

          {/* TASKS */}

          {filteredTasks.length === 0 ? (
            <div className="empty-state">

              <div className="empty-icon">
                ✦
              </div>

              <h3>
                {getEmptyMessage()}
              </h3>

              <p>
                {getEmptyDescription()}
              </p>

            </div>
          ) : (
            filteredTasks.map(
              (item) => (
                <div
                  key={item.id}
                  className={`task-row ${
                    selectedTask === item.id
                      ? "selected"
                      : ""
                  } ${
                    item.status ===
                    "Completed"
                      ? "completed"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedTask(
                      selectedTask ===
                        item.id
                        ? null
                        : item.id
                    );
                  }}
                >

                  <div className="task-time">
                    {formatTime(
                      item.time
                    )}
                  </div>

                  <div className="task-name">
                    {item.task}
                  </div>

                  <div className="task-status">

                    <label
                      className="check-wrap"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >

                      <input
                        type="checkbox"
                        checked={
                          item.status ===
                          "Completed"
                        }
                        onChange={() =>
                          toggleTask(
                            item.id
                          )
                        }
                      />

                      <span className="custom-check">
                        ✓
                      </span>

                    </label>

                  </div>

                </div>
              )
            )
          )}

        </div>
      </div>

      {/* BOTTOM CONTROLS */}

      <div className="bottom-controls">

        <div className="bottom-left">

          <button
            className="add-button"
            onClick={addTask}
          >
            Add Task
          </button>

          <button
            className="delete-button"
            onClick={deleteTask}
            disabled={
              selectedTask === null
            }
          >
            Delete
          </button>

        </div>

        <div className="bottom-right">

          <input
            className="date-control"
            type="date"
            value={selectedDate}
            onChange={(e) =>
              changeDate(
                e.target.value
              )
            }
          />

          <div className="format-switch">

            <button
              className={
                timeFormat === "12"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTimeFormat("12")
              }
            >
              12H
            </button>

            <button
              className={
                timeFormat === "24"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTimeFormat("24")
              }
            >
              24H
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default function AppWithGoogle() {
  return (
    <GoogleOAuthProvider
      clientId={
        import.meta.env.VITE_GOOGLE_CLIENT_ID
      }
    >
      <App />
    </GoogleOAuthProvider>
  );
}