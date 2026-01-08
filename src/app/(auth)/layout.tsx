import { AnimatedBackground } from '@/components/shared/AnimatedBackground'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <AnimatedBackground intensity="medium" />
      {children}
    </div>
  )
}
