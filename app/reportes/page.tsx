"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Venta = {
  id: number;
  precio_venta_usd: number;
  ganancia_usd: number;
  fecha: string;
  tiene_permuta: boolean;
  forma_pago: string | null;
  equipo: {
    modelo: string;
    costo_usd: number;
  } | null;
};

type Compra = {
  id: number;
  costo_usd: number;
  fecha: string;
  forma_pago: string | null;
  equipo: {
    modelo: string;
  } | null;
};

type Movimiento = {
  id: number;
  tipo: string;
  concepto: string;
  monto_usd: number;
  fecha: string;
};

type Periodo =
  | "mes"
  | "mes_anterior"
  | "3_meses"
  | "anio"
  | "todo";

export default function ReportesPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  const [periodo, setPeriodo] =
    useState<Periodo>("mes");

  const [cargando, setCargando] = useState(true);

  async function cargarDatos() {
    setCargando(true);

    const [
      ventasResponse,
      comprasResponse,
      movimientosResponse,
    ] = await Promise.all([
      supabase
        .from("ventas")
        .select(`
          id,
          precio_venta_usd,
          ganancia_usd,
          fecha,
          tiene_permuta,
          forma_pago,
          equipo:equipos (
            modelo,
            costo_usd
          )
        `)
        .order("fecha", { ascending: false }),

      supabase
        .from("compras")
        .select(`
          id,
          costo_usd,
          fecha,
          forma_pago,
          equipo:equipos (
            modelo
          )
        `)
        .order("fecha", { ascending: false }),

      supabase
        .from("movimientos")
        .select(`
          id,
          tipo,
          concepto,
          monto_usd,
          fecha
        `)
        .order("fecha", { ascending: false }),
    ]);

    if (ventasResponse.error) {
      console.error(ventasResponse.error);
      alert("Error al cargar las ventas.");
    } else {
      setVentas(
        (ventasResponse.data || []) as unknown as Venta[]
      );
    }

    if (comprasResponse.error) {
      console.error(comprasResponse.error);
      alert("Error al cargar las compras.");
    } else {
      setCompras(
        (comprasResponse.data || []) as unknown as Compra[]
      );
    }

    if (movimientosResponse.error) {
      console.error(movimientosResponse.error);
      alert("Error al cargar los movimientos.");
    } else {
      setMovimientos(
        movimientosResponse.data || []
      );
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  function fechaInicioPeriodo() {
    const ahora = new Date();

    if (periodo === "mes") {
      return new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        1
      );
    }

    if (periodo === "mes_anterior") {
      return new Date(
        ahora.getFullYear(),
        ahora.getMonth() - 1,
        1
      );
    }

    if (periodo === "3_meses") {
      return new Date(
        ahora.getFullYear(),
        ahora.getMonth() - 2,
        1
      );
    }

    if (periodo === "anio") {
      return new Date(
        ahora.getFullYear(),
        0,
        1
      );
    }

    return null;
  }

  function estaDentroDelPeriodo(
    fecha: string
  ) {
    const inicio = fechaInicioPeriodo();

    if (!inicio) return true;

    const fechaOperacion = new Date(fecha);

    if (periodo === "mes_anterior") {
      const ahora = new Date();

      const inicioMesAnterior = new Date(
        ahora.getFullYear(),
        ahora.getMonth() - 1,
        1
      );

      const finMesAnterior = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        1
      );

      return (
        fechaOperacion >= inicioMesAnterior &&
        fechaOperacion < finMesAnterior
      );
    }

    return fechaOperacion >= inicio;
  }

  const ventasPeriodo = useMemo(() => {
    return ventas.filter((venta) =>
      estaDentroDelPeriodo(venta.fecha)
    );
  }, [ventas, periodo]);

  const comprasPeriodo = useMemo(() => {
    return compras.filter((compra) =>
      estaDentroDelPeriodo(compra.fecha)
    );
  }, [compras, periodo]);

  const movimientosPeriodo = useMemo(() => {
    return movimientos.filter((movimiento) =>
      estaDentroDelPeriodo(movimiento.fecha)
    );
  }, [movimientos, periodo]);

  const totalVentas = ventasPeriodo.reduce(
    (total, venta) =>
      total + Number(venta.precio_venta_usd || 0),
    0
  );

  const totalGanancia = ventasPeriodo.reduce(
    (total, venta) =>
      total + Number(venta.ganancia_usd || 0),
    0
  );

  const totalCompras = comprasPeriodo.reduce(
    (total, compra) =>
      total + Number(compra.costo_usd || 0),
    0
  );

  const ingresos = movimientosPeriodo
    .filter(
      (movimiento) =>
        movimiento.tipo === "ingreso"
    )
    .reduce(
      (total, movimiento) =>
        total + Number(movimiento.monto_usd || 0),
      0
    );

  const egresos = movimientosPeriodo
    .filter(
      (movimiento) =>
        movimiento.tipo === "egreso"
    )
    .reduce(
      (total, movimiento) =>
        total + Number(movimiento.monto_usd || 0),
      0
    );

  const resultadoNeto =
    ingresos - egresos;

  const cantidadPermutas =
    ventasPeriodo.filter(
      (venta) => venta.tiene_permuta
    ).length;

  const cantidadVentasNormales =
    ventasPeriodo.filter(
      (venta) => !venta.tiene_permuta
    ).length;

  const margenPromedio =
    totalVentas > 0
      ? (totalGanancia / totalVentas) * 100
      : 0;

  const gananciaPorVenta =
    ventasPeriodo.length > 0
      ? totalGanancia / ventasPeriodo.length
      : 0;

  /* ============================
     RANKING DE MODELOS
  ============================ */

  const rankingModelos = useMemo(() => {
    const mapa: Record<
      string,
      {
        modelo: string;
        unidades: number;
        ventas: number;
        ganancia: number;
      }
    > = {};

    ventasPeriodo.forEach((venta) => {
      const modelo =
        venta.equipo?.modelo || "Sin modelo";

      if (!mapa[modelo]) {
        mapa[modelo] = {
          modelo,
          unidades: 0,
          ventas: 0,
          ganancia: 0,
        };
      }

      mapa[modelo].unidades += 1;
      mapa[modelo].ventas += Number(
        venta.precio_venta_usd || 0
      );
      mapa[modelo].ganancia += Number(
        venta.ganancia_usd || 0
      );
    });

    return Object.values(mapa).sort(
      (a, b) => b.ganancia - a.ganancia
    );
  }, [ventasPeriodo]);

  function nombrePeriodo() {
    if (periodo === "mes")
      return "Este mes";

    if (periodo === "mes_anterior")
      return "Mes anterior";

    if (periodo === "3_meses")
      return "Últimos 3 meses";

    if (periodo === "anio")
      return "Este año";

    return "Todo";
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-gray-500">
            Cargando reportes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Reportes
            </h1>

            <p className="mt-1 text-gray-500">
              Análisis del negocio por período.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            {[
              ["mes", "Este mes"],
              ["mes_anterior", "Mes anterior"],
              ["3_meses", "3 meses"],
              ["anio", "Este año"],
              ["todo", "Todo"],
            ].map(([valor, nombre]) => (

              <button
                key={valor}
                onClick={() =>
                  setPeriodo(
                    valor as Periodo
                  )
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  periodo === valor
                    ? "bg-gray-900 !text-white"
                    : "bg-white !text-gray-600 hover:bg-gray-200"
                }`}
              >
                {nombre}
              </button>

            ))}

          </div>

        </div>

        {/* PERIODO */}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm text-gray-600">
          Mostrando información de:{" "}
          <span className="font-bold text-gray-900">
            {nombrePeriodo()}
          </span>
        </div>

        {/* RESUMEN */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Ventas
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              USD {totalVentas.toFixed(2)}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              {ventasPeriodo.length} operaciones
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Ganancia
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              USD {totalGanancia.toFixed(2)}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Margen {margenPromedio.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Compras
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              USD {totalCompras.toFixed(2)}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              {comprasPeriodo.length} equipos
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Resultado de liquidez
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${
                resultadoNeto >= 0
                  ? "text-gray-900"
                  : "text-red-600"
              }`}
            >
              USD {resultadoNeto.toFixed(2)}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Ingresos − egresos
            </p>
          </div>

        </div>

        {/* OPERACIONES */}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Ventas normales
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {cantidadVentasNormales}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Permutas
            </p>

            <p className="mt-2 text-3xl font-bold text-purple-600">
              {cantidadPermutas}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Ganancia promedio por venta
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              USD {gananciaPorVenta.toFixed(2)}
            </p>

          </div>

        </div>

        {/* FLUJO DE DINERO */}

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-xl font-bold text-gray-900">
            Flujo de dinero
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">

            <div>
              <p className="text-sm text-gray-500">
                Dinero ingresado
              </p>

              <p className="mt-2 text-2xl font-bold text-green-600">
                USD {ingresos.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Dinero egresado
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600">
                USD {egresos.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Resultado
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                USD {resultadoNeto.toFixed(2)}
              </p>
            </div>

          </div>

        </div>

        {/* RANKING */}

        <div className="mt-6 rounded-2xl bg-white shadow-sm">

          <div className="border-b border-gray-200 px-6 py-5">

            <h2 className="text-xl font-bold text-gray-900">
              Rentabilidad por modelo
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Modelos ordenados por ganancia generada.
            </p>

          </div>

          {rankingModelos.length === 0 ? (

            <div className="p-8 text-center text-gray-500">
              No hay ventas en este período.
            </div>

          ) : (

            <div className="divide-y divide-gray-200">

              {rankingModelos.map(
                (modelo) => (

                  <div
                    key={modelo.modelo}
                    className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                  >

                    <div>

                      <p className="font-bold text-gray-900">
                        {modelo.modelo}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {modelo.unidades} equipo
                        {modelo.unidades !== 1
                          ? "s"
                          : ""}{" "}
                        vendido
                        {modelo.unidades !== 1
                          ? "s"
                          : ""}
                      </p>

                    </div>

                    <div className="flex flex-wrap gap-8">

                      <div>
                        <p className="text-xs text-gray-500">
                          Ventas
                        </p>

                        <p className="font-bold text-gray-900">
                          USD{" "}
                          {modelo.ventas.toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Ganancia
                        </p>

                        <p className="font-bold text-green-600">
                          USD{" "}
                          {modelo.ganancia.toFixed(2)}
                        </p>
                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

        {/* ACTUALIZAR */}

        <div className="mt-6 flex justify-end">

          <button
            onClick={cargarDatos}
            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold !text-white hover:bg-gray-800"
          >
            Actualizar reportes
          </button>

        </div>

      </div>
    </div>
  );
}