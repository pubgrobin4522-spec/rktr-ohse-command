import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RKTR_DEPARTMENTS } from "@/constants/departments";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CheckSquare,
  Eye,
  EyeOff,
  Hash,
  Loader2,
  Lock,
  Mail,
  Phone,
  Square,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DEPARTMENTS = RKTR_DEPARTMENTS;

type View = "login" | "register";

/** Validates employee number: exactly 6 digits starting with '23' */
function isValidEmployeeNumber(val: string): boolean {
  return /^23\d{4}$/.test(val.trim());
}

const INPUT_CLASS =
  "pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#18C37E]/50 focus:ring-[#18C37E]/20 h-11";

export default function LoginPage() {
  const { isAuthenticated, login, register } = useAuth();

  const navigate = useNavigate();
  const [view, setView] = useState<View>("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regDepartment, setRegDepartment] = useState("");
  const [regEmployeeNumber, setRegEmployeeNumber] = useState("");
  const [regEmpError, setRegEmpError] = useState("");
  const [regMobileNumber, setRegMobileNumber] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail) {
      setLoginError("Email is required.");
      return;
    }
    if (!loginPassword) {
      setLoginError("Password is required.");
      return;
    }
    setLoginLoading(true);
    const result = await login(
      loginEmail.trim().toLowerCase(),
      loginPassword,
      remember,
    );
    setLoginLoading(false);
    if (!result.success) {
      const msg = result.error ?? "Login failed.";
      setLoginError(msg);
    } else {
      toast.success("Welcome back!", {
        description: "Logging into OHSE Command Center",
      });
      navigate("/dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (!regName.trim()) {
      setRegError("Full name is required.");
      return;
    }
    if (!regDepartment.trim()) {
      setRegError("Department is required.");
      return;
    }
    if (!regEmployeeNumber.trim()) {
      setRegError("Employee number is required.");
      return;
    }
    if (!isValidEmployeeNumber(regEmployeeNumber)) {
      setRegError("Employee number must start with 23 and be exactly 6 digits");
      return;
    }
    if (!regMobileNumber.trim()) {
      setRegError("Mobile number is required.");
      return;
    }
    if (!regPassword) {
      setRegError("Password is required.");
      return;
    }
    if (regPassword.length < 6) {
      setRegError("Password must be at least 6 characters.");
      return;
    }
    if (!regConfirm) {
      setRegError("Please confirm your password.");
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError("Passwords do not match.");
      return;
    }
    // Generate placeholder email from employee number
    const placeholderEmail = `${regEmployeeNumber.trim()}@rktrwheels.com`;
    setRegLoading(true);
    const result = await register(
      regName,
      placeholderEmail,
      regPassword,
      regDepartment,
      regEmployeeNumber,
      regMobileNumber,
    );
    setRegLoading(false);
    if (!result.success) {
      setRegError(result.error ?? "Registration failed.");
    } else {
      setRegSuccess(true);
      toast.success("Registration submitted!", {
        description: "Your account is pending activation by the administrator.",
        duration: 6000,
      });
    }
  };

  const switchToLogin = () => {
    setView("login");
    setRegError("");
    setRegSuccess(false);
  };

  const switchToRegister = () => {
    setView("register");
    setLoginError("");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "#040c1a" }}
      data-ocid="login.page"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/assets/generated/login-bg.dim_1920x1080.jpg')`,
          opacity: 0.35,
        }}
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(24,195,126,0.08) 0%, transparent 60%), linear-gradient(135deg, rgba(8,20,38,0.95) 0%, rgba(4,12,26,0.98) 100%)",
        }}
      />
      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Card */}
        <div
          className="rounded-2xl shadow-industrial overflow-hidden"
          style={{
            background: "rgba(8,20,38,0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          data-ocid="login.card"
        >
          {/* Logo — always visible */}
          <div className="pt-8 px-8 pb-0">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex flex-col items-center mb-6"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "rgba(24,195,126,0.12)",
                  border: "1px solid rgba(24,195,126,0.3)",
                }}
              >
                <img
                  src="/assets/rktr-logo.jpg"
                  alt="RKTR"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="font-display font-bold text-2xl tracking-wider text-white">
                    RKTR
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded font-mono"
                    style={{
                      background: "rgba(24,195,126,0.15)",
                      color: "#18C37E",
                      border: "1px solid rgba(24,195,126,0.3)",
                    }}
                  >
                    OHSE
                  </span>
                </div>
                <p className="text-xs text-white/40 tracking-widest uppercase">
                  Command Center
                </p>
                <p className="text-xs text-white/25 mt-1">
                  Ramkrishna Titagarh Rail Wheels Limited
                </p>
              </div>
            </motion.div>

            {/* Tab switcher */}
            <div
              className="flex rounded-xl p-1 mb-6"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <button
                type="button"
                onClick={switchToLogin}
                data-ocid="login.tab"
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                style={{
                  background:
                    view === "login" ? "rgba(24,195,126,0.15)" : "transparent",
                  color:
                    view === "login" ? "#18C37E" : "rgba(255,255,255,0.35)",
                  border:
                    view === "login"
                      ? "1px solid rgba(24,195,126,0.25)"
                      : "1px solid transparent",
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={switchToRegister}
                data-ocid="register.tab"
                className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                style={{
                  background:
                    view === "register"
                      ? "rgba(24,195,126,0.15)"
                      : "transparent",
                  color:
                    view === "register" ? "#18C37E" : "rgba(255,255,255,0.35)",
                  border:
                    view === "register"
                      ? "1px solid rgba(24,195,126,0.25)"
                      : "1px solid transparent",
                }}
              >
                Register
              </button>
            </div>
          </div>

          {/* Animated panel */}
          <div className="px-8 pb-8">
            <AnimatePresence mode="wait" initial={false}>
              {view === "login" ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <form
                    onSubmit={handleLogin}
                    className="space-y-4"
                    data-ocid="login.form"
                  >
                    {/* Error */}
                    {loginError && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2.5 p-3 rounded-lg text-sm"
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          color: "#fca5a5",
                        }}
                        data-ocid="login.error_state"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {loginError}
                      </motion.div>
                    )}

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="login-email"
                        className="text-xs font-medium text-white/50 uppercase tracking-wide"
                      >
                        Corporate Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <Input
                          id="login-email"
                          type="email"
                          value={loginEmail}
                          onChange={(e) => {
                            setLoginEmail(e.target.value);
                            setLoginError("");
                          }}
                          placeholder="you@rktrwheels.com"
                          autoComplete="email"
                          data-ocid="login.email_input"
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="login-password"
                        className="text-xs font-medium text-white/50 uppercase tracking-wide"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          data-ocid="login.password_input"
                          className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#18C37E]/50 focus:ring-[#18C37E]/20 h-11"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowLoginPassword(!showLoginPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-smooth"
                        >
                          {showLoginPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Remember + Forgot */}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setRemember(!remember)}
                        data-ocid="login.remember_checkbox"
                        className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-smooth"
                      >
                        {remember ? (
                          <CheckSquare
                            className="w-4 h-4"
                            style={{ color: "#18C37E" }}
                          />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        Remember me
                      </button>
                      <button
                        type="button"
                        data-ocid="login.forgot_password"
                        onClick={() =>
                          toast.info(
                            "Password reset link sent to your corporate email.",
                          )
                        }
                        className="text-xs transition-smooth hover:underline"
                        style={{ color: "#18C37E" }}
                      >
                        Forgot password?
                      </button>
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      disabled={loginLoading}
                      data-ocid="login.submit_button"
                      className="w-full h-11 font-display font-semibold text-sm tracking-wide"
                      style={{
                        background: loginLoading
                          ? "rgba(24,195,126,0.5)"
                          : "#18C37E",
                        color: "#081426",
                        border: "none",
                      }}
                    >
                      {loginLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Authenticating…
                        </>
                      ) : (
                        <>Sign In</>
                      )}
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  {regSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center text-center py-6 gap-4"
                      data-ocid="register.success_state"
                    >
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{
                          background: "rgba(24,195,126,0.15)",
                          border: "1px solid rgba(24,195,126,0.35)",
                        }}
                      >
                        <CheckCircle2
                          className="w-8 h-8"
                          style={{ color: "#18C37E" }}
                        />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-lg mb-2">
                          Registration Submitted!
                        </p>
                        <p className="text-sm text-white/55 leading-relaxed">
                          Your account is pending activation by the
                          administrator. You will be notified once approved.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={switchToLogin}
                        data-ocid="register.back_to_login_button"
                        className="w-full h-11 font-display font-semibold text-sm tracking-wide"
                        style={{
                          background: "#18C37E",
                          color: "#081426",
                          border: "none",
                        }}
                      >
                        Back to Sign In
                      </Button>
                    </motion.div>
                  ) : (
                    <form
                      onSubmit={handleRegister}
                      className="space-y-4"
                      data-ocid="register.form"
                    >
                      {/* Error */}
                      {regError && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-2.5 p-3 rounded-lg text-sm"
                          style={{
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            color: "#fca5a5",
                          }}
                          data-ocid="register.error_state"
                        >
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {regError}
                        </motion.div>
                      )}

                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="reg-name"
                          className="text-xs font-medium text-white/50 uppercase tracking-wide"
                        >
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                          <Input
                            id="reg-name"
                            type="text"
                            value={regName}
                            onChange={(e) => {
                              setRegName(e.target.value);
                              setRegError("");
                            }}
                            placeholder="Enter your full name"
                            autoComplete="name"
                            data-ocid="register.name_input"
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>

                      {/* Department */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="reg-dept"
                          className="text-xs font-medium text-white/50 uppercase tracking-wide"
                        >
                          Department
                        </label>
                        <Select
                          value={regDepartment}
                          onValueChange={(val) => {
                            setRegDepartment(val);
                            setRegError("");
                          }}
                        >
                          <SelectTrigger
                            id="reg-dept"
                            data-ocid="register.department_input"
                            className="bg-white/5 border-white/10 text-white h-11 focus:border-[#18C37E]/50 focus:ring-[#18C37E]/20 [&>span]:text-white/20 data-[placeholder]:text-white/20"
                          >
                            <Building2 className="w-4 h-4 text-white/25 mr-2 shrink-0" />
                            <SelectValue placeholder="Select your department" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0d1f36] border-white/10 text-white max-h-60">
                            {DEPARTMENTS.map((dept) => (
                              <SelectItem
                                key={dept}
                                value={dept}
                                className="text-white/80 focus:bg-white/10 focus:text-white"
                              >
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Employee Number */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="reg-empno"
                          className="text-xs font-medium text-white/50 uppercase tracking-wide"
                        >
                          Employee Number
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                          <Input
                            id="reg-empno"
                            type="text"
                            value={regEmployeeNumber}
                            maxLength={6}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              setRegEmployeeNumber(val);
                              setRegError("");
                              if (
                                val.length > 0 &&
                                !isValidEmployeeNumber(val) &&
                                val.length === 6
                              ) {
                                setRegEmpError(
                                  "Employee number must start with 23 and be exactly 6 digits",
                                );
                              } else {
                                setRegEmpError("");
                              }
                            }}
                            onBlur={() => {
                              if (
                                regEmployeeNumber.length > 0 &&
                                !isValidEmployeeNumber(regEmployeeNumber)
                              ) {
                                setRegEmpError(
                                  "Employee number must start with 23 and be exactly 6 digits",
                                );
                              } else {
                                setRegEmpError("");
                              }
                            }}
                            placeholder="Enter your employee number"
                            data-ocid="register.employee_number_input"
                            className={`${INPUT_CLASS}${
                              regEmpError
                                ? " border-red-500/50 focus:border-red-500/70"
                                : regEmployeeNumber &&
                                    isValidEmployeeNumber(regEmployeeNumber)
                                  ? " border-[#18C37E]/50"
                                  : ""
                            }`}
                          />
                          {regEmployeeNumber &&
                            isValidEmployeeNumber(regEmployeeNumber) && (
                              <CheckCircle2
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
                                style={{ color: "#18C37E" }}
                              />
                            )}
                        </div>
                        {regEmpError && (
                          <p
                            className="text-xs flex items-center gap-1 mt-1"
                            style={{ color: "#fca5a5" }}
                            data-ocid="register.employee_number.field_error"
                          >
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            {regEmpError}
                          </p>
                        )}
                      </div>

                      {/* Mobile Number */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="reg-mobile"
                          className="text-xs font-medium text-white/50 uppercase tracking-wide"
                        >
                          Mobile Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                          <Input
                            id="reg-mobile"
                            type="tel"
                            value={regMobileNumber}
                            onChange={(e) => {
                              setRegMobileNumber(e.target.value);
                              setRegError("");
                            }}
                            placeholder="Enter your mobile number"
                            data-ocid="register.mobile_number_input"
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="reg-password"
                          className="text-xs font-medium text-white/50 uppercase tracking-wide"
                        >
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                          <Input
                            id="reg-password"
                            type={showRegPassword ? "text" : "password"}
                            value={regPassword}
                            onChange={(e) => {
                              setRegPassword(e.target.value);
                              setRegError("");
                            }}
                            placeholder="Min. 6 characters"
                            autoComplete="new-password"
                            data-ocid="register.password_input"
                            className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#18C37E]/50 focus:ring-[#18C37E]/20 h-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-smooth"
                          >
                            {showRegPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="reg-confirm"
                          className="text-xs font-medium text-white/50 uppercase tracking-wide"
                        >
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                          <Input
                            id="reg-confirm"
                            type={showRegConfirm ? "text" : "password"}
                            value={regConfirm}
                            onChange={(e) => {
                              setRegConfirm(e.target.value);
                              setRegError("");
                            }}
                            placeholder="Re-enter your password"
                            autoComplete="new-password"
                            data-ocid="register.confirm_password_input"
                            className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#18C37E]/50 focus:ring-[#18C37E]/20 h-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegConfirm(!showRegConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-smooth"
                          >
                            {showRegConfirm ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Submit */}
                      <Button
                        type="submit"
                        disabled={regLoading}
                        data-ocid="register.submit_button"
                        className="w-full h-11 font-display font-semibold text-sm tracking-wide mt-2"
                        style={{
                          background: regLoading
                            ? "rgba(24,195,126,0.5)"
                            : "#18C37E",
                          color: "#081426",
                          border: "none",
                        }}
                      >
                        {regLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Registering…
                          </>
                        ) : (
                          <>Create Account</>
                        )}
                      </Button>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer badge */}
        <p
          className="text-center text-xs mt-4"
          style={{ color: "rgba(255,255,255,0.18)" }}
        >
          {view === "login"
            ? "Restricted access — @rktrwheels.com employees only"
            : "New accounts require admin approval before access is granted"}
        </p>
      </motion.div>
    </div>
  );
}
