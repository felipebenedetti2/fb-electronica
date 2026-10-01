"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Cuenta = {
  id: number;
  nombre: string;
  moneda: string;
  tipo: string;
  activa: boolean;
};

type Movimiento = {
  id: number;
  tipo: string;
  concepto: string;
  monto_usd: number;
  fecha: string;
  cuenta_id: number | null;
  moneda: string | null;
  monto_original: number | null;
  cotizacion_usd: number | null;
};

type Equipo = {
  id: number;
  modelo: string;
  costo_usd: number;
  precio_venta_usd: number | null;
  estado_stock: string;
};

type Venta = {
  id: number;
  precio_venta_usd: number;
  ganancia_usd: number;
  fecha: string;
  cliente: {
    nombre: string;
  } | null;
  equipo: {
    modelo: string;
  } | null;
};

type PagoTarjeta = {
  id: number;
  monto_neto_usd: number;
  estado: string;
  fecha_venta: string;
};

function dinero(valor: number) {
  return Number(valor || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Home() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [pagosTarjeta, setPagosTarjeta] = useState<PagoTarjeta[]>([]);

  const [cargando, setCargando] = useState(true);

  async function cargarDashboard() {
    setCargando(true);

    const [
      cuentasResult,
      movimientosResult,
      equiposResult,
      ventasResult,
      tarjetasResult,
    ] = await Promise.all([
      supabase
        .from("cuentas_liquidez")
        .select("*")
        .eq("activa", true)
        .order("id"),

      supabase
        .from("movimientos")
        .select("*")
        .order("fecha", {
          ascending: false,
        }),

      supabase
        .from("equipos")
        .select(
          "id, modelo, costo_usd, precio_venta_usd, estado_stock"
        )
        .eq("estado_stock", "disponible"),

      supabase
        .from("ventas")
        .select(`
          id,
          precio_venta_usd,
          ganancia_usd,
          fecha,
          cliente:clientes (
            nombre
          ),
          equipo:equipos (
            modelo
          )
        `)
        .order("fecha", {
          ascending: false,
        }),

      supabase
        .from("pagos_tarjeta")
        .select(
          "id, monto_neto_usd, estado, fecha_venta"
        )
        .eq("estado", "pendiente"),
    ]);

    if (cuentasResult.error) {
      console.error(
        "Error cuentas:",
        cuentasResult.error
      );
    }

    if (movimientosResult.error) {
      console.error(
        "Error movimientos:",
        movimientosResult.error
      );
    }

    if (equiposResult.error) {
      console.error(
        "Error equipos:",
        equiposResult.error
      );
    }

    if (ventasResult.error) {
      console.error(
        "Error ventas:",
        ventasResult.error
      );
    }

    if (tarjetasResult.error) {
      console.error(
        "Error tarjetas:",
        tarjetasResult.error
      );
    }

    setCuentas(
      (cuentasResult.data || []) as Cuenta[]
    );

    setMovimientos(
      (movimientosResult.data || []) as Movimiento[]
    );

    setEquipos(
      (equiposResult.data || []) as Equipo[]
    );

    setVentas(
      (ventasResult.data || []) as unknown as Venta[]
    );

    setPagosTarjeta(
      (tarjetasResult.data || []) as PagoTarjeta[]
    );

    setCargando(false);
  }

  useEffect(() => {
    cargarDashboard();
  }, []);

  // ==========================================
  // LIQUIDEZ POR CUENTA
  // ==========================================

  function saldoCuentaUsd(cuentaId: number) {
    return movimientos
      .filter(
        (movimiento) =>
          movimiento.cuenta_id === cuentaId
      )
      .reduce((total, movimiento) => {
        const monto = Number(
          movimiento.monto_usd || 0
        );

        if (movimiento.tipo === "ingreso") {
          return total + monto;
        }

        return total - monto;
      }, 0);
  }

  const liquidez = cuentas
    .filter(
      (cuenta) => cuenta.tipo !== "tarjeta"
    )
    .reduce(
      (total, cuenta) =>
        total + saldoCuentaUsd(cuenta.id),
      0
    );

  // ==========================================
  // STOCK
  // ==========================================

  const valorStock = equipos.reduce(
    (total, equipo) =>
      total +
      Number(equipo.costo_usd || 0),
    0
  );

  // ==========================================
  // TARJETAS PENDIENTES
  // ==========================================

  const tarjetasPendientes =
    pagosTarjeta.reduce(
      (total, pago) =>
        total +
        Number(
          pago.monto_neto_usd || 0
        ),
      0
    );

  // ==========================================
  // PATRIMONIO
  // ==========================================

  const patrimonio =
    liquidez +
    valorStock +
    tarjetasPendientes;

  // ==========================================
  // VENTAS DEL MES
  // ==========================================

  const ahora = new Date();

  const ventasDelMes = ventas.filter(
    (venta) => {
      const fecha = new Date(
        venta.fecha
      );

      return (
        fecha.getMonth() ===
          ahora.getMonth() &&
        fecha.getFullYear() ===
          ahora.getFullYear()
      );
    }
  );

  const ventasMes =
    ventasDelMes.reduce(
      (total, venta) =>
        total +
        Number(
          venta.precio_venta_usd || 0
        ),
      0
    );

  const gananciaMes =
    ventasDelMes.reduce(
      (total, venta) =>
        total +
        Number(
          venta.ganancia_usd || 0
        ),
      0
    );

  // ==========================================
  // FORMATO
  // ==========================================

  const cantidadEquipos =
    equipos.length;

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">

        {/* ========================================== */}
        {/* ENCABEZADO */}
        {/* ========================================== */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

          <div>
            <p className="text-sm font-medium text-gray-500">
              FB ELECTRÓNICA
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Inicio
            </h1>

            <p className="mt-2 text-gray-500">
              Resumen general del negocio.
            </p>
          </div>

          <Link
            href="/operaciones"
            className="rounded-xl bg-gray-900 px-5 py-3 text-center text-sm font-medium text-white hover:bg-gray-800"
          >
            + Nueva operación
          </Link>

        </div>

        {cargando ? (

          <div className="mt-12 text-center text-gray-500">
            Cargando información...
          </div>

        ) : (

          <>

            {/* ========================================== */}
            {/* RESUMEN PRINCIPAL */}
            {/* ========================================== */}

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

              {/* LIQUIDEZ */}

              <Link
                href="/liquidez"
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >

                <p className="text-sm text-gray-500">
                  Liquidez disponible
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  USD{" "}
                  {dinero(liquidez)}
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  Dinero actualmente disponible
                </p>

              </Link>

              {/* STOCK */}

              <Link
                href="/stock"
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >

                <p className="text-sm text-gray-500">
                  Stock
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  USD{" "}
                  {dinero(valorStock)}
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  {cantidadEquipos}{" "}
                  {cantidadEquipos === 1
                    ? "equipo"
                    : "equipos"}{" "}
                  disponibles
                </p>

              </Link>

              {/* TARJETAS */}

              <Link
                href="/liquidez"
                className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >

                <p className="text-sm text-amber-700">
                  Tarjetas pendientes
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-900">
                  USD{" "}
                  {dinero(
                    tarjetasPendientes
                  )}
                </p>

                <p className="mt-2 text-xs text-amber-600">
                  Pendiente de acreditación
                </p>

              </Link>

              {/* PATRIMONIO */}

              <Link
                href="/liquidez"
                className="rounded-2xl bg-gray-900 p-6 shadow-sm transition hover:-translate-y-1"
              >

                <p className="text-sm text-gray-300">
                  Patrimonio
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  USD{" "}
                  {dinero(
                    patrimonio
                  )}
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  Liquidez + stock + tarjetas
                </p>

              </Link>

            </div>

            {/* ========================================== */}
            {/* VENTAS DEL MES */}
            {/* ========================================== */}

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

              {/* VENTAS */}

              <Link
                href="/ventas"
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <p className="text-sm text-gray-500">
                      Ventas del mes
                    </p>

                    <p className="mt-2 text-2xl font-bold text-gray-900">
                      USD{" "}
                      {dinero(
                        ventasMes
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">
                    {
                      ventasDelMes.length
                    }{" "}
                    {ventasDelMes.length ===
                    1
                      ? "venta"
                      : "ventas"}
                  </div>

                </div>

              </Link>

              {/* GANANCIA */}

              <Link
                href="/ventas"
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >

                <p className="text-sm text-gray-500">
                  Ganancia del mes
                </p>

                <p className="mt-2 text-2xl font-bold text-green-600">
                  +USD{" "}
                  {dinero(
                    gananciaMes
                  )}
                </p>

                <p className="mt-2 text-xs text-gray-400">
                  Resultado de las ventas del mes
                </p>

              </Link>

            </div>

            {/* ========================================== */}
            {/* ÚLTIMAS VENTAS + ACTIVIDAD */}
            {/* ========================================== */}

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

              {/* ÚLTIMAS VENTAS */}

              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">

                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">

                  <div>

                    <h2 className="font-semibold text-gray-900">
                      Últimas ventas
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Operaciones recientes.
                    </p>

                  </div>

                  <Link
                    href="/ventas"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Ver todas →
                  </Link>

                </div>

                {ventas.length === 0 ? (

                  <div className="p-8 text-center text-gray-500">
                    Todavía no hay ventas.
                  </div>

                ) : (

                  <div className="divide-y divide-gray-200">

                    {ventas
                      .slice(0, 5)
                      .map((venta) => (

                        <div
                          key={venta.id}
                          className="flex items-center justify-between px-6 py-4"
                        >

                          <div>

                            <p className="font-medium text-gray-900">
                              {venta.equipo?.modelo ||
                                "Equipo"}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {venta.cliente?.nombre ||
                                "Cliente"}
                            </p>

                          </div>

                          <div className="text-right">

                            <p className="font-semibold text-gray-900">
                              USD{" "}
                              {dinero(
                                Number(
                                  venta.precio_venta_usd
                                )
                              )}
                            </p>

                            <p className="mt-1 text-xs text-green-600">
                              +USD{" "}
                              {dinero(
                                Number(
                                  venta.ganancia_usd
                                )
                              )}
                            </p>

                          </div>

                        </div>

                      ))}

                  </div>

                )}

              </div>

              {/* ACTIVIDAD */}

              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">

                <div className="border-b border-gray-200 px-6 py-5">

                  <h2 className="font-semibold text-gray-900">
                    Actividad reciente
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Últimos movimientos de dinero.
                  </p>

                </div>

                {movimientos.length === 0 ? (

                  <div className="p-8 text-center text-gray-500">
                    Todavía no hay movimientos.
                  </div>

                ) : (

                  <div className="divide-y divide-gray-200">

                    {movimientos
                      .slice(0, 5)
                      .map((movimiento) => (

                        <div
                          key={movimiento.id}
                          className="flex items-center justify-between px-6 py-4"
                        >

                          <div>

                            <p className="font-medium text-gray-900">
                              {
                                movimiento.concepto
                              }
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {new Date(
                                movimiento.fecha
                              ).toLocaleString(
                                "es-AR"
                              )}
                            </p>

                          </div>

                          <p
                            className={`font-semibold ${
                              movimiento.tipo ===
                              "ingreso"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {movimiento.tipo ===
                            "ingreso"
                              ? "+"
                              : "-"}{" "}
                            USD{" "}
                            {dinero(
                              Number(
                                movimiento.monto_usd
                              )
                            )}
                          </p>

                        </div>

                      ))}

                  </div>

                )}

              </div>

            </div>

            {/* ========================================== */}
            {/* ACCESOS RÁPIDOS */}
            {/* ========================================== */}

            <div className="mt-8">

              <h2 className="text-xl font-semibold text-gray-900">
                Accesos rápidos
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Entrá directamente a las secciones que más usás.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">

                <Link
                  href="/operaciones"
                  className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <p className="font-semibold text-gray-900">
                    Nueva operación
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Venta / permuta
                  </p>
                </Link>

                <Link
                  href="/stock"
                  className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <p className="font-semibold text-gray-900">
                    Stock
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Ver equipos
                  </p>
                </Link>

                <Link
                  href="/compras"
                  className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <p className="font-semibold text-gray-900">
                    Compras
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Ingresar equipos
                  </p>
                </Link>

                <Link
                  href="/liquidez"
                  className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <p className="font-semibold text-gray-900">
                    Liquidez
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Ver dinero
                  </p>
                </Link>

              </div>

            </div>

          </>

        )}

      </div>
    </div>
  );
}