"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Configuracion = {
  nombre_negocio: string;
  telefono: string;
  whatsapp: string;
  email: string;
  direccion: string;
  cotizacion_usd_ars: string;
  cotizacion_usdt_usd: string;
  moneda_principal: string;
  confirmaciones: boolean;
};

const configuracionInicial: Configuracion = {
  nombre_negocio: "FB Electrónica",
  telefono: "",
  whatsapp: "",
  email: "",
  direccion: "",
  cotizacion_usd_ars: "",
  cotizacion_usdt_usd: "1",
  moneda_principal: "USD",
  confirmaciones: true,
};

const STORAGE_KEY = "fb_electronica_configuracion";

export default function ConfiguracionPage() {
  const [configuracion, setConfiguracion] =
    useState<Configuracion>(configuracionInicial);

  const [guardando, setGuardando] = useState(false);

  const [mostrarReset, setMostrarReset] = useState(false);
  const [textoReset, setTextoReset] = useState("");
  const [restableciendo, setRestableciendo] = useState(false);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  function cargarConfiguracion() {
    try {
      const guardada = localStorage.getItem(STORAGE_KEY);

      if (!guardada) return;

      const datos = JSON.parse(guardada);

      setConfiguracion({
        ...configuracionInicial,
        ...datos,
      });
    } catch (error) {
      console.error(
        "Error cargando configuración:",
        error
      );
    }
  }

  function actualizarCampo(
    campo: keyof Configuracion,
    valor: string | boolean
  ) {
    setConfiguracion((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function guardarConfiguracion() {
    try {
      setGuardando(true);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(configuracion)
      );

      alert("Configuración guardada correctamente ✅");
    } catch (error) {
      console.error(
        "Error guardando configuración:",
        error
      );

      alert(
        "No se pudo guardar la configuración."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function restablecerDatos() {
    if (textoReset !== "RESTABLECER") {
      alert(
        'Escribí exactamente "RESTABLECER" para continuar.'
      );
      return;
    }

    try {
      setRestableciendo(true);

      const { error } =
        await supabase.rpc("restablecer_datos");

      if (error) {
        console.error(
          "Error restableciendo datos:",
          error
        );

        alert(
          "No se pudieron restablecer los datos: " +
            error.message
        );

        return;
      }

      localStorage.removeItem(STORAGE_KEY);

      setConfiguracion(configuracionInicial);
      setTextoReset("");
      setMostrarReset(false);

      alert(
        "Los datos operativos fueron restablecidos correctamente ✅"
      );

      window.location.reload();
    } catch (error) {
      console.error(
        "Error restableciendo datos:",
        error
      );

      alert(
        "Ocurrió un error al restablecer los datos."
      );
    } finally {
      setRestableciendo(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ENCABEZADO */}
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Configuración
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Configurá los datos generales y preferencias
            de FB Electrónica.
          </p>
        </div>

        {/* DATOS DEL NEGOCIO */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Datos del negocio
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Información general de tu negocio.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nombre del negocio
              </label>

              <input
                value={configuracion.nombre_negocio}
                onChange={(e) =>
                  actualizarCampo(
                    "nombre_negocio",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="FB Electrónica"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Teléfono
              </label>

              <input
                value={configuracion.telefono}
                onChange={(e) =>
                  actualizarCampo(
                    "telefono",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="341..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                WhatsApp
              </label>

              <input
                value={configuracion.whatsapp}
                onChange={(e) =>
                  actualizarCampo(
                    "whatsapp",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="341..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                type="email"
                value={configuracion.email}
                onChange={(e) =>
                  actualizarCampo(
                    "email",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="contacto@..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Dirección
              </label>

              <input
                value={configuracion.direccion}
                onChange={(e) =>
                  actualizarCampo(
                    "direccion",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="Dirección del local"
              />
            </div>
          </div>
        </section>

        {/* MONEDAS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Monedas y cotizaciones
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Configurá las cotizaciones que utiliza el
              sistema para mostrar los valores.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                USD / ARS
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={configuracion.cotizacion_usd_ars}
                onChange={(e) =>
                  actualizarCampo(
                    "cotizacion_usd_ars",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="Ej: 1500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                USDT / USD
              </label>

              <input
                type="number"
                min="0"
                step="0.0001"
                value={configuracion.cotizacion_usdt_usd}
                onChange={(e) =>
                  actualizarCampo(
                    "cotizacion_usdt_usd",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="1"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Moneda principal
              </label>

              <select
                value={configuracion.moneda_principal}
                onChange={(e) =>
                  actualizarCampo(
                    "moneda_principal",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              >
                <option value="USD">USD</option>
                <option value="USDT">USDT</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>
        </section>

        {/* PREFERENCIAS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Preferencias
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ajustes generales del funcionamiento del
              sistema.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
            <div>
              <p className="font-medium text-slate-900">
                Confirmar operaciones importantes
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Mostrar confirmaciones antes de realizar
                acciones importantes.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                actualizarCampo(
                  "confirmaciones",
                  !configuracion.confirmaciones
                )
              }
              className={`relative h-7 w-12 rounded-full transition ${
                configuracion.confirmaciones
                  ? "bg-slate-900"
                  : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                  configuracion.confirmaciones
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </button>
          </div>
        </section>

        {/* GUARDAR */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={guardarConfiguracion}
            disabled={guardando}
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando
              ? "Guardando..."
              : "Guardar configuración"}
          </button>
        </div>

        {/* ZONA DE PELIGRO */}
        <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-red-600">
              Zona de peligro
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Estas acciones pueden eliminar información
              operativa del sistema.
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-red-100 bg-red-50 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                Restablecer datos operativos
              </p>

              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Elimina ventas, compras, movimientos,
                equipos, clientes y proveedores.
                Las cuentas de liquidez se conservan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setTextoReset("");
                setMostrarReset(true);
              }}
              className="rounded-xl border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Restablecer datos
            </button>
          </div>
        </section>
      </div>

      {/* MODAL RESET */}
      {mostrarReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-slate-900">
              Restablecer datos
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Esta acción eliminará todos los datos
              operativos actuales:
            </p>

            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Ventas</li>
              <li>Compras</li>
              <li>Movimientos</li>
              <li>Equipos</li>
              <li>Clientes</li>
              <li>Proveedores</li>
            </ul>

            <p className="mt-4 text-sm font-medium text-red-600">
              Esta acción no se puede deshacer.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Escribí RESTABLECER para continuar
              </label>

              <input
                value={textoReset}
                onChange={(e) =>
                  setTextoReset(e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-red-400"
                placeholder="RESTABLECER"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setMostrarReset(false);
                  setTextoReset("");
                }}
                disabled={restableciendo}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={restablecerDatos}
                disabled={
                  restableciendo ||
                  textoReset !== "RESTABLECER"
                }
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {restableciendo
                  ? "Restableciendo..."
                  : "Restablecer todo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}