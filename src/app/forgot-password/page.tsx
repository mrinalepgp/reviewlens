'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { sendResetLink } from './actions'

const initialState = {
  error: '',
  success: false
}

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    const res = await sendResetLink(formData)
    return res || { error: '' }
  }, initialState)

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xl shadow-[0_0_20px_rgba(79,70,229,0.4)]">
            R
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-400">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/[0.02] border border-white/10 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 backdrop-blur-xl">
          {state?.success ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white">Check your email</h3>
              <p className="text-sm text-neutral-400">
                We've sent a password reset link to your email address.
              </p>
              <div className="pt-4">
                <Link href="/login" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" action={formAction}>
              {state?.error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-sm text-rose-400 text-center">
                  {state.error}
                </div>
              )}

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
                      Sending...
                    </span>
                  ) : 'Send Reset Link'}
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center">
                <Link href="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
                  Return to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
