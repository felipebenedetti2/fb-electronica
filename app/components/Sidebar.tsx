"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "Inicio", href: "/" },
  { name: "Ventas", href: "/ventas" },
  { name: "Stock", href: "/stock" },
  { name: "Compras", href: "/compras" },
  { name: "Clientes", href: "/clientes" },
  { name: "Proveedores", href: "/proveedores" },
  { name: "Liquidez", href: "/liquidez" },
  { name: "Movimientos", href: "/movimientos" },
  { name: "Reportes", href: "/reportes" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      
      <div className="border-b border-gray-200 px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900">
          FB Electrónica
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Sistema de gestión
        </p>
      </div>

      <nav className="flex-1 px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Menú
        </p>

        <div className="space-y-1">
          {menuItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-3 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-gray-200 p-4">
        <Link
          href="/configuracion"
          className="block rounded-xl px-3 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Configuración
        </Link>
      </div>
    </aside>
  );
}
