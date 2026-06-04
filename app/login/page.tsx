"use client";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/dashboard");
  };

  return (
    <div>
      <h1>Ops Watch Login</h1>

      <input placeholder="Username" />
      <input placeholder="Password" type="password" />

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}
