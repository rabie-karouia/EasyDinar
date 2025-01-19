import React, { useState } from "react";
import { Shield, Smartphone, CheckCircle, AlertCircle, Lock, KeyRound } from "lucide-react";

type AuthMethod = "sms";
type VerificationStep = "method" | "phone" | "code" | "success";
type SecurityOption = "main" | "2fa" | "password";

export default function SecuritySection() {
  const [currentView, setCurrentView] = useState<SecurityOption>("main");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("sms");
  const [step, setStep] = useState<VerificationStep>("method");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);

  // Handle SMS authentication selection
  const handleMethodSelect = async () => {
    setAuthMethod("sms");
    setStep("phone");
    setError(null);
  };

  // Handle sending the verification code
  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8000/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${localStorage.getItem("token")}`, // Include token for authentication
        },
        body: new URLSearchParams({ phone_number: phoneNumber }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        if (data.success) {
          setError(null);
          setStep("code"); // Move to the code input step
        } else {
          setError(data.message || "Failed to send verification code.");
        }
      } else {
        // Handle specific cases such as 2FA already enabled
        setError(data.detail || "An error occurred while sending the verification code.");
      }
    } catch (error) {
      setError("An error occurred while sending the verification code. Please try again.");
      console.error("Error in handleSendVerification:", error);
    }
  };
  

  // Handle verification code submission
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = code.join(""); // Combine the code array into a single string
    try {
      const token = localStorage.getItem("token"); // Retrieve the token from localStorage
      if (!token) {
        setError("You must be logged in to verify the code.");
        return;
      }
  
      const response = await fetch("http://localhost:8000/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`, // Include Authorization header
        },
        body: new URLSearchParams({
          phone_number: phoneNumber, // Phone number entered by the user
          code: enteredCode, // Combined code entered by the user
        }),
      });
  
      const data = await response.json();
      if (response.ok) {
        setStep("success"); // Navigate to success step
        setError(null); // Clear any existing error messages
      } else {
        setError(data.message || "Invalid verification code. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      setError("An error occurred while verifying the code. Please try again.");
    }
  };
  

  // Handle changes in the code input fields
  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      if (value && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const renderMainOptions = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">Security Options</h3>
      <div className="grid grid-cols-1 gap-4">
        <MethodCard
          icon={<Shield className="h-6 w-6" />}
          title="2-Factor Authentication"
          description="Add an extra layer of security to your account"
          onClick={() => setCurrentView("2fa")}
          selected={false}
        />
      </div>
    </div>
  );

  const renderTwoFactorOptions = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <button
          onClick={() => {
            setCurrentView("main");
            setStep("method");
            setCode(["", "", "", "", "", ""]);
          }}
          className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-2"
        >
          <KeyRound className="h-4 w-4" />
          <span>Back to Security Options</span>
        </button>
      </div>
      <h3 className="text-xl font-semibold text-gray-800">Choose 2FA Method</h3>
      <div className="grid grid-cols-1 gap-4">
        <MethodCard
          icon={<Smartphone className="h-6 w-6" />}
          title="SMS Authentication"
          description="Receive a code via text message"
          onClick={handleMethodSelect}
          selected={authMethod === "sms"}
        />
      </div>
    </div>
  );

  const renderPhoneNumberInput = () => (
    <form onSubmit={handleSendVerification} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Enter Your Phone Number</h3>
        <p className="text-gray-600">We'll send a verification code to this number.</p>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., +216XXXXXXXX"
          required
        />
      </div>
      {error && (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      <button
        type="submit"
        className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Send Code
      </button>
    </form>
  );

  const renderCodeVerification = () => (
    <form onSubmit={handleVerifyCode} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Enter Verification Code</h3>
        <p className="text-gray-600">Enter the 6-digit code sent to your phone.</p>
      </div>
      <div className="flex justify-center space-x-3">
        {code.map((digit, index) => (
          <input
            key={index}
            id={`code-${index}`}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            className="w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg focus:border-indigo-500 focus:ring focus:ring-indigo-200"
          />
        ))}
      </div>
      {error && (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      <button
        type="submit"
        className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Verify Code
      </button>
    </form>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800">2FA Successfully Enabled</h3>
      <p className="text-gray-600">Your account is now more secure with two-factor authentication.</p>
      <button
        onClick={() => {
          setCurrentView("main");
          setStep("method");
          setCode(["", "", "", "", "", ""]);
        }}
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      >
        Back to Security Options
      </button>
    </div>
  );

  const renderContent = () => {
    if (currentView === "main") {
      return renderMainOptions();
    }
    
    if (currentView === "2fa") {
      if (step === "method") {
        return renderTwoFactorOptions();
      }
      if (step === "phone") {
        return renderPhoneNumberInput();
      }
      if (step === "code") {
        return renderCodeVerification();
      }
      if (step === "success") {
        return renderSuccess();
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Security Center</h2>
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-indigo-600" />
          <span className="text-sm text-gray-600">Enhanced Security</span>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">{renderContent()}</div>
    </div>
  );
}

interface MethodCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  selected: boolean;
}

function MethodCard({ icon, title, description, onClick, selected }: MethodCardProps) {
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-lg border-2 text-left transition-all ${
        selected
          ? "border-indigo-500 bg-indigo-50"
          : "border-gray-200 hover:border-indigo-200 hover:bg-gray-50"
      }`}
    >
      <div className={`${selected ? "text-indigo-600" : "text-gray-600"}`}>{icon}</div>
      <h4 className={`mt-4 font-semibold ${selected ? "text-indigo-900" : "text-gray-800"}`}>
        {title}
      </h4>
      <p className={`mt-2 text-sm ${selected ? "text-indigo-600" : "text-gray-600"}`}>{description}</p>
    </button>
  );
}
