import { Shield } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 text-white p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8" />
          <span className="text-xl font-bold">VulnScan ASM</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold mb-4">
            Secure Your Digital Assets
          </h2>
          <p className="text-blue-200 text-lg">
            Discover your attack surface, detect vulnerabilities automatically,
            and manage security risks before they become breaches.
          </p>
        </div>
        <p className="text-blue-300 text-sm">
          © {new Date().getFullYear()} VulnScan ASM
        </p>
      </div>

      {/* Right side — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
