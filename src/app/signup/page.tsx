"use client"

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { signup } from './actions'
import { signIn } from 'next-auth/react'

const initialState = {
  error: ''
}

export default function SignupPage() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('')
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    const res = await signup(formData)
    return res || { error: '' }
  }, initialState)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value
    const confirmPassword = (e.currentTarget.elements.namedItem('confirmPassword') as HTMLInputElement).value
    
    if (password !== confirmPassword) {
      e.preventDefault()
      setPasswordError('Passwords do not match')
      return
    }
    setPasswordError('')
  }

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: 'bg-transparent', textColor: 'text-transparent' }
    if (pass.length < 6) return { score: 1, text: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-400' }
    
    const hasMixed = /[a-zA-Z]/.test(pass) && /[0-9]/.test(pass)
    const isStrong = pass.length >= 8 && /[A-Z]/.test(pass) && /[a-z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)

    if (isStrong) return { score: 3, text: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400' }
    if (hasMixed && pass.length >= 6) return { score: 2, text: 'Medium', color: 'bg-amber-500', textColor: 'text-amber-400' }
    
    return { score: 1, text: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-400' }
  }

  const strength = getPasswordStrength(passwordInput)

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xl shadow-[0_0_20px_rgba(79,70,229,0.4)]">
            R
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Create a Merchant Account
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in instead
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/[0.02] border border-white/10 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 backdrop-blur-xl">
          <form className="space-y-5" action={formAction} onSubmit={handleSubmit}>
            {state?.error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400 text-center">
                {state.error}
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400 text-center">
                {passwordError}
              </div>
            )}
            
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-neutral-300">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2.5 border border-white/10 rounded-xl bg-black/40 shadow-sm placeholder-neutral-500 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="e.g. Alexander Pierce"
                />
              </div>
            </div>

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-neutral-300">
                WhatsApp Number
              </label>
              <div className="mt-1">
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  required
                  pattern="^\+?[0-9\s\-]{10,15}$"
                  title="Please enter a valid phone number (10-15 digits, optional + prefix)"
                  className="appearance-none block w-full px-3 py-2.5 border border-white/10 rounded-xl bg-black/40 shadow-sm placeholder-neutral-500 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2.5 border border-white/10 rounded-xl bg-black/40 shadow-sm placeholder-neutral-500 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  title="Password must be at least 8 characters long"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 pr-10 border border-white/10 rounded-xl bg-black/40 shadow-sm placeholder-neutral-500 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-200"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordInput && (
                <div className="mt-2 flex items-center justify-between px-1">
                  <div className="flex gap-1 w-full max-w-[60%]">
                    <div className={`h-1 w-full rounded-full transition-colors ${strength.score >= 1 ? strength.color : 'bg-white/10'}`} />
                    <div className={`h-1 w-full rounded-full transition-colors ${strength.score >= 2 ? strength.color : 'bg-white/10'}`} />
                    <div className={`h-1 w-full rounded-full transition-colors ${strength.score >= 3 ? strength.color : 'bg-white/10'}`} />
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${strength.textColor}`}>{strength.text}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-300">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 pr-10 border border-white/10 rounded-xl bg-black/40 shadow-sm placeholder-neutral-500 text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-200"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {confirmPasswordInput.length > 0 && (
                <div className={`mt-2 px-1 text-xs flex items-center gap-1.5 font-medium ${passwordInput === confirmPasswordInput ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {passwordInput === confirmPasswordInput ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Passwords match
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Passwords do not match
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="text-xs text-neutral-400 mt-4 mb-4 text-center">
              By clicking Create Account, you agree to our <Link href="#" className="text-indigo-400 hover:text-indigo-300">Terms of Service</Link> and <Link href="#" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>.
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.2)] text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-neutral-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </span>
                ) : 'Create Account'}
              </button>
            </div>

            <div className="mt-6 flex items-center">
              <div className="flex-1 border-t border-white/10"></div>
              <div className="px-3 text-sm font-medium text-neutral-500">Or continue with</div>
              <div className="flex-1 border-t border-white/10"></div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={async () => {
                  setIsGoogleLoading(true)
                  await signIn('google', { callbackUrl: '/dashboard' })
                }}
                className="w-full inline-flex justify-center items-center gap-3 py-2.5 px-4 border border-white/10 rounded-xl shadow-sm bg-white/[0.03] text-sm font-medium text-neutral-300 hover:bg-white/[0.06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGoogleLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-neutral-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Redirecting...
                  </span>
                ) : (
                  <>
                    <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                        fill="#EA4335"
                      />
                      <path
                        d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                        fill="#34A853"
                      />
                    </svg>
                    Sign up with Google
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
