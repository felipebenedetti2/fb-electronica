"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Movimiento = {
  id: number;
  tipo: string;
  concepto: string;
  monto_usd: number;
  referencia: string | null;
  fecha: string | null;
};

type Compra = {
  id: number;
  proveedor_id: number | null;
  equipo_id: number | null;
  costo_usd: number;
  forma_pago: string | null;
  fecha: string | null;
  proveedor: {
    nombre: string;
  } | null;
  equipo: {
    modelo: string;
    descripcion: string | null;
    imei: string | null;
    estado: string;
    bateria: number | null;
    color: string | null;
    costo_usd: number;
  } | null;
};

type Venta = {
  id: number;
  cliente: {
    nombre: string;
  } | null;
  equipo: {
    modelo: string;
    descripcion: string | null;
    imei: string | null;
    costo_usd: number;
  } | null;
  precio_venta_usd: number;
  ganancia_usd: number;
  forma_pago: string | null;
  fecha: string | null;

  tiene_permuta: boolean;
  equipo_recibido_modelo: string | null;
  equipo_recibido_imei: string | null;
  equipo_recibido_costo_usd: number | null;
  valor_toma_usd: number | null;
  diferencia_pagada_usd: number | null;
};

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);

  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [filtroTipo, setFiltroTipo] = useState<
    "todos" | "ingreso" | "egreso"
  >("todos");

  async function cargarDatos() {
    setCargando(true);

    const [
      movimientosResponse,
      comprasResponse,
      ventasResponse,
    ] = await Promise.all([
      supabase
        .from("movimientos")
        .select("*")
        .order("fecha", { ascending: false }),

      supabase
        .from("compras")
        .select(`
          id,
          proveedor_id,
          equipo_id,
          costo_usd,
          forma_pago,
          fecha,
          proveedor:proveedores (
            nombre
          ),
          equipo:equipos (
            modelo,
            descripcion,
            imei,
            estado,
            bateria,
            color,
            costo_usd
          )
        `)
        .order("fecha", { ascending: false }),

      supabase
        .from("ventas")
        .select(`
          id,
          precio_venta_usd,
          ganancia_usd,
          forma_pago,
          fecha,
          tiene_permuta,
          equipo_recibido_modelo,
          equipo_recibido_imei,
          equipo_recibido_costo_usd,
          valor_toma_usd,
          diferencia_pagada_usd,
          cliente:clientes (
            nombre
          ),
          equipo:equipos (
            modelo,
            descripcion,
            imei,
            costo_usd
          )
        `)
        .order("fecha", { ascending: false }),
    ]);

    if (movimientosResponse.error) {
      console.error(movimientosResponse.error);
      alert("Error al cargar los movimientos.");
    } else {
      setMovimientos(movimientosResponse.data || []);
    }

    if (comprasResponse.error) {
      console.error(comprasResponse.error);
      alert("Error al cargar las compras.");
    } else {
      setCompras(
        (comprasResponse.data || []) as unknown as Compra[]
      );
    }

    if (ventasResponse.error) {
      console.error(ventasResponse.error);
      alert("Error al cargar las ventas.");
    } else {
      setVentas(
        (ventasResponse.data || []) as unknown as Venta[]
      );
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function obtenerCompra(
    movimiento: Movimiento
  ): Compra | null {
    if (!movimiento.referencia) return null;

    const match =
      movimiento.referencia.match(/Compra #(\d+)/);

    if (!match) return null;

    const compraId = Number(match[1]);

    return (
      compras.find(
        (compra) => compra.id === compraId
      ) || null
    );
  }

  function obtenerVenta(
    movimiento: Movimiento
  ): Venta | null {
    if (!movimiento.referencia) return null;

    const match =
      movimiento.referencia.match(/Venta #(\d+)/);

    if (!match) return null;

    const ventaId = Number(match[1]);

    return (
      ventas.find(
        (venta) => venta.id === ventaId
      ) || null
    );
  }

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((movimiento) => {
      const coincideTipo =
        filtroTipo === "todos" ||
        movimiento.tipo === filtroTipo;

      const compra = obtenerCompra(movimiento);
      const venta = obtenerVenta(movimiento);

      const texto = `
        ${movimiento.concepto}
        ${movimiento.referencia || ""}
        ${movimiento.tipo}

        ${compra?.equipo?.modelo || ""}
        ${compra?.equipo?.imei || ""}
        ${compra?.proveedor?.nombre || ""}

        ${venta?.equipo?.modelo || ""}
        ${venta?.equipo?.imei || ""}
        ${venta?.cliente?.nombre || ""}

        ${venta?.equipo_recibido_modelo || ""}
        ${venta?.equipo_recibido_imei || ""}
        ${venta?.forma_pago || ""}
      `.toLowerCase();

      const coincideBusqueda =
        texto.includes(busqueda.toLowerCase());

      return coincideTipo && coincideBusqueda;
    });
  }, [
    movimientos,
    compras,
    ventas,
    filtroTipo,
    busqueda,
  ]);

  const totalIngresos = movimientosFiltrados
    .filter(
      (movimiento) => movimiento.tipo === "ingreso"
    )
    .reduce(
      (total, movimiento) =>
        total + Number(movimiento.monto_usd || 0),
      0
    );

  const totalEgresos = movimientosFiltrados
    .filter(
      (movimiento) => movimiento.tipo === "egreso"
    )
    .reduce(
      (total, movimiento) =>
        total + Number(movimiento.monto_usd || 0),
      0
    );

  const resultado =
    totalIngresos - totalEgresos;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl">

        {/* ENCABEZADO */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Movimientos
          </h1>

          <p className="mt-1 text-gray-500">
            Historial detallado de todos los ingresos y egresos.
          </p>
        </div>

        {/* RESUMEN */}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Ingresos
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              USD {totalIngresos.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Egresos
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              USD {totalEgresos.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Resultado
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${
                resultado >= 0
                  ? "text-gray-900"
                  : "text-red-600"
              }`}
            >
              USD {resultado.toFixed(2)}
            </p>
          </div>

        </div>

        {/* FILTROS */}

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex flex-wrap gap-2">

              <button
                onClick={() => setFiltroTipo("todos")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  filtroTipo === "todos"
                    ? "bg-gray-900 !text-white"
                    : "bg-gray-100 !text-gray-600 hover:bg-gray-200"
                }`}
              >
                Todos
              </button>

              <button
                onClick={() => setFiltroTipo("ingreso")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  filtroTipo === "ingreso"
                    ? "bg-green-600 !text-white"
                    : "bg-gray-100 !text-gray-600 hover:bg-gray-200"
                }`}
              >
                Ingresos
              </button>

              <button
                onClick={() => setFiltroTipo("egreso")}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  filtroTipo === "egreso"
                    ? "bg-red-600 !text-white"
                    : "bg-gray-100 !text-gray-600 hover:bg-gray-200"
                }`}
              >
                Egresos
              </button>

            </div>

            <div className="w-full lg:w-96">

              <input
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(e.target.value)
                }
                placeholder="Buscar equipo, IMEI, cliente..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3"
              />

            </div>

          </div>

        </div>

        {/* HISTORIAL */}

        <div className="rounded-2xl bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Historial detallado
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {movimientosFiltrados.length} movimiento
                {movimientosFiltrados.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <button
              onClick={cargarDatos}
              disabled={cargando}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold !text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Actualizar
            </button>

          </div>

          {cargando ? (

            <div className="p-10 text-center text-gray-500">
              Cargando movimientos...
            </div>

          ) : movimientosFiltrados.length === 0 ? (

            <div className="p-10 text-center text-gray-500">
              No hay movimientos para mostrar.
            </div>

          ) : (

            <div className="divide-y divide-gray-200">

              {movimientosFiltrados.map(
                (movimiento) => {

                  const esIngreso =
                    movimiento.tipo === "ingreso";

                  const compra =
                    obtenerCompra(movimiento);

                  const venta =
                    obtenerVenta(movimiento);

                  const esPermuta =
                    venta?.tiene_permuta === true;

                  return (
                    <div
                      key={movimiento.id}
                      className="p-6 transition hover:bg-gray-50"
                    >

                      <div className="flex flex-col gap-5">

                        {/* CABECERA */}

                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                          <div className="flex items-start gap-4">

                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                                esIngreso
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {esIngreso ? "+" : "−"}
                            </div>

                            <div>

                              <div className="flex flex-wrap items-center gap-2">

                                <h3 className="font-bold text-gray-900">
                                  {movimiento.concepto}
                                </h3>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    esIngreso
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {esIngreso
                                    ? "Ingreso"
                                    : "Egreso"}
                                </span>

                                {esPermuta && (
                                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                                    Permuta
                                  </span>
                                )}

                              </div>

                              <div className="mt-2 space-y-1 text-sm text-gray-500">

                                {movimiento.fecha && (
                                  <p>
                                    {new Date(
                                      movimiento.fecha
                                    ).toLocaleString(
                                      "es-AR",
                                      {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                      }
                                    )}
                                  </p>
                                )}

                                {movimiento.referencia && (
                                  <p>
                                    {movimiento.referencia}
                                  </p>
                                )}

                              </div>

                            </div>

                          </div>

                          <div className="text-left md:text-right">

                            <p
                              className={`text-xl font-bold ${
                                esIngreso
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {esIngreso ? "+" : "−"} USD{" "}
                              {Number(
                                movimiento.monto_usd
                              ).toFixed(2)}
                            </p>

                          </div>

                        </div>

                        {/* ================================= */}
                        {/* INGRESO DE UNA VENTA */}
                        {/* ================================= */}

                        {venta && (

                          <div className="rounded-2xl border border-green-100 bg-green-50 p-5">

                            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                              <div>

                                <div className="flex flex-wrap items-center gap-2">

                                  <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                                    {esPermuta
                                      ? "Detalle de permuta"
                                      : "Detalle de venta"}
                                  </p>

                                  {esPermuta && (
                                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                                      Permuta
                                    </span>
                                  )}

                                </div>

                                <h4 className="mt-1 text-xl font-bold text-gray-900">
                                  Venta #{venta.id}
                                </h4>

                              </div>

                              <div className="rounded-xl bg-white px-4 py-3">

                                <p className="text-xs text-gray-500">
                                  Medio de pago
                                </p>

                                <p className="mt-1 font-bold text-gray-900">
                                  {venta.forma_pago ||
                                    "No especificado"}
                                </p>

                              </div>

                            </div>

                            {/* EQUIPO VENDIDO */}

                            <div className="rounded-xl bg-white p-5">

                              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Equipo vendido / entregado
                              </p>

                              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

                                <div>
                                  <p className="text-sm text-gray-500">
                                    Equipo
                                  </p>

                                  <p className="mt-1 text-lg font-bold text-gray-900">
                                    {venta.equipo?.modelo ||
                                      "Sin modelo"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-sm text-gray-500">
                                    IMEI
                                  </p>

                                  <p className="mt-1 font-semibold text-gray-900">
                                    {venta.equipo?.imei ||
                                      "Sin IMEI"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-sm text-gray-500">
                                    Cliente
                                  </p>

                                  <p className="mt-1 font-semibold text-gray-900">
                                    {venta.cliente?.nombre ||
                                      "Sin cliente"}
                                  </p>
                                </div>

                              </div>

                            </div>

                            {/* DATOS FINANCIEROS */}

                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">

                              <div className="rounded-xl bg-white p-4">
                                <p className="text-sm text-gray-500">
                                  Precio de venta
                                </p>

                                <p className="mt-1 text-lg font-bold text-gray-900">
                                  USD{" "}
                                  {Number(
                                    venta.precio_venta_usd
                                  ).toFixed(2)}
                                </p>
                              </div>

                              <div className="rounded-xl bg-white p-4">
                                <p className="text-sm text-gray-500">
                                  Costo del equipo
                                </p>

                                <p className="mt-1 text-lg font-bold text-gray-900">
                                  USD{" "}
                                  {Number(
                                    venta.equipo
                                      ?.costo_usd || 0
                                  ).toFixed(2)}
                                </p>
                              </div>

                              <div className="rounded-xl bg-white p-4">
                                <p className="text-sm text-gray-500">
                                  Ganancia
                                </p>

                                <p className="mt-1 text-lg font-bold text-green-600">
                                  USD{" "}
                                  {Number(
                                    venta.ganancia_usd
                                  ).toFixed(2)}
                                </p>
                              </div>

                            </div>

                            {/* ================================= */}
                            {/* PERMUTA */}
                            {/* ================================= */}

                            {esPermuta && (

                              <div className="mt-5 rounded-2xl border border-purple-200 bg-purple-50 p-5">

                                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-purple-600">
                                  Equipo recibido en la permuta
                                </p>

                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">

                                  <div>
                                    <p className="text-sm text-gray-500">
                                      Equipo recibido
                                    </p>

                                    <p className="mt-1 text-lg font-bold text-gray-900">
                                      {venta.equipo_recibido_modelo ||
                                        "Sin modelo"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-500">
                                      IMEI recibido
                                    </p>

                                    <p className="mt-1 font-semibold text-gray-900">
                                      {venta.equipo_recibido_imei ||
                                        "Sin IMEI"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-500">
                                      Valor de toma
                                    </p>

                                    <p className="mt-1 text-lg font-bold text-gray-900">
                                      USD{" "}
                                      {Number(
                                        venta.valor_toma_usd ||
                                          0
                                      ).toFixed(2)}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-sm text-gray-500">
                                      Diferencia cobrada
                                    </p>

                                    <p className="mt-1 text-lg font-bold text-green-600">
                                      USD{" "}
                                      {Number(
                                        venta.diferencia_pagada_usd ||
                                          0
                                      ).toFixed(2)}
                                    </p>
                                  </div>

                                </div>

                                <div className="mt-5 border-t border-purple-200 pt-4">

                                  <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">

                                    <p>
                                      <span className="text-gray-500">
                                        Equipo entregado:
                                      </span>{" "}
                                      <span className="font-semibold text-gray-900">
                                        {venta.equipo?.modelo ||
                                          "Sin modelo"}
                                      </span>
                                    </p>

                                    <p>
                                      <span className="text-gray-500">
                                        Equipo recibido:
                                      </span>{" "}
                                      <span className="font-semibold text-gray-900">
                                        {venta.equipo_recibido_modelo ||
                                          "Sin modelo"}
                                      </span>
                                    </p>

                                    <p>
                                      <span className="text-gray-500">
                                        Medio de pago:
                                      </span>{" "}
                                      <span className="font-semibold text-gray-900">
                                        {venta.forma_pago ||
                                          "No especificado"}
                                      </span>
                                    </p>

                                  </div>

                                </div>

                              </div>

                            )}

                          </div>

                        )}

                        {/* ================================= */}
                        {/* EGRESO DE COMPRA */}
                        {/* ================================= */}

                        {compra && (

                          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">

                            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                              <div>

                                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                                  Equipo comprado
                                </p>

                                <h4 className="mt-1 text-xl font-bold text-gray-900">
                                  {compra.equipo?.modelo ||
                                    "Equipo"}
                                </h4>

                              </div>

                              <div className="rounded-xl bg-white px-4 py-3">

                                <p className="text-xs text-gray-500">
                                  Medio de pago
                                </p>

                                <p className="mt-1 font-bold text-gray-900">
                                  {compra.forma_pago ||
                                    "No especificado"}
                                </p>

                              </div>

                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

                              <div>
                                <p className="text-sm text-gray-500">
                                  Equipo
                                </p>

                                <p className="mt-1 font-bold text-gray-900">
                                  {compra.equipo?.modelo ||
                                    "Sin modelo"}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm text-gray-500">
                                  IMEI
                                </p>

                                <p className="mt-1 font-semibold text-gray-900">
                                  {compra.equipo?.imei ||
                                    "Sin IMEI"}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm text-gray-500">
                                  Proveedor
                                </p>

                                <p className="mt-1 font-semibold text-gray-900">
                                  {compra.proveedor?.nombre ||
                                    "Sin proveedor"}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm text-gray-500">
                                  Costo
                                </p>

                                <p className="mt-1 font-bold text-red-600">
                                  USD{" "}
                                  {Number(
                                    compra.costo_usd
                                  ).toFixed(2)}
                                </p>
                              </div>

                            </div>

                            <div className="mt-4 flex flex-wrap gap-6 border-t border-red-100 pt-4 text-sm">

                              {compra.equipo?.estado && (
                                <p>
                                  <span className="text-gray-500">
                                    Estado:
                                  </span>{" "}
                                  <span className="font-semibold text-gray-900">
                                    {compra.equipo.estado}
                                  </span>
                                </p>
                              )}

                              {compra.equipo?.bateria !==
                                null &&
                                compra.equipo?.bateria !==
                                  undefined && (
                                  <p>
                                    <span className="text-gray-500">
                                      Batería:
                                    </span>{" "}
                                    <span className="font-semibold text-gray-900">
                                      {
                                        compra.equipo
                                          .bateria
                                      }
                                      %
                                    </span>
                                  </p>
                                )}

                              {compra.equipo?.color && (
                                <p>
                                  <span className="text-gray-500">
                                    Color:
                                  </span>{" "}
                                  <span className="font-semibold text-gray-900">
                                    {
                                      compra.equipo
                                        .color
                                    }
                                  </span>
                                </p>
                              )}

                            </div>

                          </div>

                        )}

                        {/* ================================= */}
                        {/* MOVIMIENTO MANUAL */}
                        {/* ================================= */}

                        {!compra && !venta && (

                          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">

                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Movimiento manual
                            </p>

                            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">

                              <div>
                                <p className="text-sm text-gray-500">
                                  Concepto
                                </p>

                                <p className="mt-1 font-semibold text-gray-900">
                                  {movimiento.concepto}
                                </p>
                              </div>

                              <div>
                                <p className="text-sm text-gray-500">
                                  Referencia
                                </p>

                                <p className="mt-1 font-semibold text-gray-900">
                                  {movimiento.referencia ||
                                    "Sin referencia"}
                                </p>
                              </div>

                            </div>

                          </div>

                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </div>

      </div>
    </div>
  );
}