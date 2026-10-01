
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Venta = {
  id: number;
  cliente_id: number | null;
  equipo_id: number | null;
  precio_venta_usd: number;
  ganancia_usd: number;
  forma_pago: string | null;
  fecha: string;
  tiene_permuta: boolean;
  equipo_recibido_modelo: string | null;
  equipo_recibido_imei: string | null;
  valor_toma_usd: number | null;
  diferencia_pagada_usd: number | null;
  cuotas: number | null;
  comision_tarjeta_usd: number | null;
  monto_neto_usd: number | null;
  estado_acreditacion: string | null;
  clienteNombre: string;
  equipoModelo: string;
  equipoImei: string | null;
  equipoCosto: number;
};

function dinero(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarVentas = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      // Primero obtenemos las ventas sin relaciones anidadas.
      const { data: registros, error: errorVentas } = await supabase
        .from("ventas")
        .select("*")
        .order("fecha", { ascending: false });

      if (errorVentas) {
        throw errorVentas;
      }

      const lista = registros || [];

      if (lista.length === 0) {
        setVentas([]);
        return;
      }

      const clienteIds = [
        ...new Set(
          lista
            .map((v) => v.cliente_id)
            .filter((id): id is number => id !== null)
        ),
      ];

      const equipoIds = [
        ...new Set(
          lista
            .map((v) => v.equipo_id)
            .filter((id): id is number => id !== null)
        ),
      ];

      // Buscamos clientes y equipos por separado.
      const [clientesResp, equiposResp] = await Promise.all([
        clienteIds.length > 0
          ? supabase
              .from("clientes")
              .select("id, nombre")
              .in("id", clienteIds)
          : Promise.resolve({ data: [], error: null }),

        equipoIds.length > 0
          ? supabase
              .from("equipos")
              .select("id, modelo, imei, costo_usd")
              .in("id", equipoIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (clientesResp.error) {
        throw clientesResp.error;
      }

      if (equiposResp.error) {
        throw equiposResp.error;
      }

      const clientes = new Map(
        (clientesResp.data || []).map((c) => [c.id, c.nombre])
      );

      const equipos = new Map(
        (equiposResp.data || []).map((e) => [e.id, e])
      );

      const resultado: Venta[] = lista.map((v) => {
        const equipo = v.equipo_id
          ? equipos.get(v.equipo_id)
          : undefined;

        return {
          ...v,
          clienteNombre: v.cliente_id
            ? clientes.get(v.cliente_id) || "Sin cliente"
            : "Sin cliente",
          equipoModelo: equipo?.modelo || "Equipo no disponible",
          equipoImei: equipo?.imei || null,
          equipoCosto: Number(equipo?.costo_usd || 0),
          precio_venta_usd: Number(v.precio_venta_usd || 0),
          ganancia_usd: Number(v.ganancia_usd || 0),
          valor_toma_usd:
            v.valor_toma_usd == null
              ? null
              : Number(v.valor_toma_usd),
          diferencia_pagada_usd:
            v.diferencia_pagada_usd == null
              ? null
              : Number(v.diferencia_pagada_usd),
          comision_tarjeta_usd: Number(
            v.comision_tarjeta_usd || 0
          ),
          monto_neto_usd:
            v.monto_neto_usd == null
              ? null
              : Number(v.monto_neto_usd),
        };
      });

      setVentas(resultado);
    } catch (e) {
      console.error("Error al cargar ventas:", e);
      setError(
        e instanceof Error
          ? e.message
          : "Ocurrió un error al cargar las ventas."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarVentas();
  }, [cargarVentas]);

  const totalVentas = ventas.reduce(
    (total, venta) => total + venta.precio_venta_usd,
    0
  );

  const totalGanancias = ventas.reduce(
    (total, venta) => total + venta.ganancia_usd,
    0
  );

  const cantidadPermutas = ventas.filter(
    (venta) => venta.tiene_permuta
  ).length;

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">
              OPERACIONES
            </p>

            <h1 className="mt-1 text-3xl font-bold text-gray-900">
              Ventas
            </h1>

            <p className="mt-2 text-gray-500">
              Historial de todas las ventas realizadas.
            </p>
          </div>

          <button
            onClick={() => void cargarVentas()}
            disabled={cargando}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            {cargando ? "Actualizando..." : "Actualizar"}
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Ventas realizadas
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {ventas.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Total vendido</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              USD {dinero(totalVentas)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Ganancia total</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              USD {dinero(totalGanancias)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Permutas</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {cantidadPermutas}
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="font-semibold text-gray-900">
              Historial de ventas
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {ventas.length} operación(es) registrada(s).
            </p>
          </div>

          {cargando ? (
            <div className="p-10 text-center text-gray-500">
              Cargando ventas...
            </div>
          ) : error ? (
            <div className="m-6 rounded-xl bg-red-50 p-5 text-sm text-red-700">
              <p className="font-semibold">
                Error al cargar las ventas
              </p>
              <p className="mt-2">{error}</p>
            </div>
          ) : ventas.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No se encontraron ventas en la consulta.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {ventas.map((venta) => (
                <div
                  key={venta.id}
                  className="px-6 py-6 transition hover:bg-gray-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-gray-900">
                          {venta.equipoModelo}
                        </p>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            venta.tiene_permuta
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {venta.tiene_permuta ? "Permuta" : "Venta"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-600">
                        Cliente: {venta.clienteNombre}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {new Date(venta.fecha).toLocaleString("es-AR")}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        USD {dinero(venta.precio_venta_usd)}
                      </p>

                      <p className="mt-1 text-sm text-green-600">
                        Ganancia: USD {dinero(venta.ganancia_usd)}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {venta.forma_pago || "Sin especificar"}
                      </p>
                    </div>
                  </div>

                  {venta.forma_pago
                    ?.toLowerCase()
                    .includes("tarjeta") && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="font-medium text-amber-900">
                        Información de tarjeta
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-amber-900">
                        <span>Cuotas: {venta.cuotas || 1}</span>
                        <span>
                          Comisión: USD{" "}
                          {dinero(venta.comision_tarjeta_usd)}
                        </span>

                        {venta.monto_neto_usd != null && (
                          <span>
                            Neto a acreditar: USD{" "}
                            {dinero(venta.monto_neto_usd)}
                          </span>
                        )}

                        <span>
                          Estado:{" "}
                          {venta.estado_acreditacion || "Sin estado"}
                        </span>
                      </div>
                    </div>
                  )}

                  {venta.tiene_permuta && (
                    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-5">
                      <p className="text-sm font-semibold text-blue-900">
                        Equipo recibido en la permuta
                      </p>

                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs text-blue-600">
                            Equipo
                          </p>
                          <p className="mt-1 font-medium text-blue-950">
                            {venta.equipo_recibido_modelo || "Sin especificar"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-blue-600">
                            Valor de toma
                          </p>
                          <p className="mt-1 font-medium text-blue-950">
                            USD {dinero(venta.valor_toma_usd)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-blue-600">
                            Diferencia cobrada
                          </p>
                          <p className="mt-1 font-medium text-blue-950">
                            USD {dinero(venta.diferencia_pagada_usd)}
                          </p>
                        </div>
                      </div>

                      {venta.equipo_recibido_imei && (
                        <p className="mt-4 text-xs text-blue-700">
                          IMEI recibido: {venta.equipo_recibido_imei}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
                    <span>
                      Costo equipo vendido: USD {dinero(venta.equipoCosto)}
                    </span>

                    {venta.equipoImei && (
                      <span>IMEI vendido: {venta.equipoImei}</span>
                    )}

                    <span>Venta #{venta.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}