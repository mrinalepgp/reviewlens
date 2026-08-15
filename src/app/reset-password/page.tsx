'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { updatePassword } from './actions'

const initialState = {
  error: ''
}

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('')
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    const res = await updatePassword(formData)
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
          Set New Password
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-400">
          Please enter your new password below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/[0.02] border border-white/10 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 backdrop-blur-xl">
          <form className="space-y-6" action={formAction} onSubmit={handleSubmit}>
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
              <label htmlFor="password" className="block text-sm font-medium text-neutral-300">
                New Password
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
                Confirm New Password
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
                  placeholder="Confirm your new password"
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
                    Updating...
                  </span>
                ) : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
