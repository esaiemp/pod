import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { Brand } from '@/components/layout/brand'

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f8] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <ResetPasswordForm />
      </div>
    </main>
  )
}
