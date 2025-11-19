import React, { useEffect, useMemo, useState } from 'react'

type Health = { ok: boolean, error?: string }

const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

const StatusPage: React.FC = () => {
  const [health, setHealth] = useState<Health>({ ok: false })
  const [loading, setLoading] = useState(true)
  const [opsOk, setOpsOk] = useState(false)
  const [dbOk, setDbOk] = useState(false)
  const [segments, setSegments] = useState(56)
  const [period, setPeriod] = useState<{start:number,end:number}>({start:0,end:0})
  const [connSeries, setConnSeries] = useState<boolean[]>([])
  const [opsSeries, setOpsSeries] = useState<boolean[]>([])
  const [dbLatencySeries, setDbLatencySeries] = useState<number[]>([])
  const [apiLatencySeries, setApiLatencySeries] = useState<number[]>([])
  const [dbSize, setDbSize] = useState<number>(0)
  const [dbMax, setDbMax] = useState<number>(536870912)

  const tables = ['contracts', 'users', 'audit_log', 'contract_types']

  const periodLabel = useMemo(() => {
    const now = new Date()
    const endMonth = months[now.getMonth()]
    const endYear = now.getFullYear()
    const start = new Date(now)
    start.setMonth(now.getMonth() - 3)
    const startMonth = months[start.getMonth()]
    const startYear = start.getFullYear()
    return `${startYear} ${startMonth} - ${endYear} ${endMonth}`
  }, [])

  useEffect(() => {
    const run = async () => {
      try {
        const h = await fetch('/api/health')
        const hjson = await h.json()
        setHealth(hjson)
        const m = await fetch('/api/status-metrics')
        if (m.ok) {
          const json = await m.json()
          setSegments(json.segments || 56)
          setPeriod(json.period || {start:0,end:0})
          setConnSeries(json.connectivity || [])
          setOpsSeries(json.operations || [])
          setDbLatencySeries(json.dbLatency || [])
          setApiLatencySeries(json.apiLatency || [])
          setOpsOk((json.operations || []).every(Boolean))
        } else {
          setOpsOk(false)
        }
        const d = await fetch('/api/db-metrics')
        if (d.ok) {
          const dj = await d.json()
          setDbOk(dj.connected === true)
          setDbSize(dj.sizeBytes || 0)
          setDbMax(dj.maxBytes || 536870912)
        } else {
          setDbOk(false)
        }
      } catch (e: any) {
        setHealth({ ok: false, error: e?.message })
        setOpsOk(false)
        setDbOk(false)
      } finally {
        setLoading(false)
      }
    }
    run()
    const id = setInterval(run, 5000)
    return () => clearInterval(id)
  }, [])

  const renderBarSeries = (series: boolean[]) => (
    <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${series.length || segments}, minmax(0, 1fr))` }}>
      {(series.length ? series : Array.from({length: segments}).map(() => false)).map((v, i) => (
        <div key={i} className={`h-2 rounded ${v ? 'bg-emerald-600' : 'bg-rose-600'}`}></div>
      ))}
    </div>
  )

  const renderLatencyBar = (series: number[]) => (
    <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${series.length || segments}, minmax(0, 1fr))` }}>
      {(series.length ? series : Array.from({length: segments}).map(() => 0)).map((ms, i) => {
        const color = ms <= 100 ? 'bg-emerald-600' : ms <= 400 ? 'bg-amber-500' : 'bg-rose-600'
        return <div key={i} className={`h-2 rounded ${color}`}></div>
      })}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const overallOk = health.ok && dbOk

  return (
    <div className="space-y-6">
      <div className={`rounded-xl border ${overallOk ? 'border-emerald-700 bg-emerald-700/90' : 'border-rose-700 bg-rose-700/90'} text-white p-4 flex items-start justify-between`}> 
        <div>
          <div className="flex items-center gap-2 text-lg font-bold">
            <i className={`bi ${overallOk ? 'bi-check-circle' : 'bi-exclamation-triangle'}`}></i>
            <span>{overallOk ? 'النظام يعمل بكفاءة' : 'هناك مشاكل تؤثر على النظام'}</span>
          </div>
          <p className="text-sm mt-2 opacity-90">{overallOk ? 'لا توجد مشاكل معروفة تؤثر على أنظمتنا.' : 'يرجى مراجعة الإعدادات والاتصال بقاعدة البيانات.'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 text-slate-100">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold">حالة النظام</h3>
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <i className="bi bi-calendar3"></i>
            <span>{period.start && period.end ? `${new Date(period.start).toLocaleDateString('ar-LY', { month:'long', year:'numeric'})} - ${new Date(period.end).toLocaleDateString('ar-LY', { month:'long', year:'numeric'})}` : periodLabel}</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="bi bi-check-circle text-emerald-500"></i>
                <span className="font-bold">Database Connectivity</span>
              </div>
              <span className="text-xs font-bold text-emerald-500">{health.ok ? 'Operational' : 'Down'}</span>
            </div>
            {renderBarSeries(connSeries)}
          </div>

          <div className="bg-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="bi bi-hdd-stack text-emerald-500"></i>
                <span className="font-bold">Database Memory (0.5GB)</span>
              </div>
              <span className="text-xs font-bold text-blue-400">{Math.round(Math.min(100, (dbSize / dbMax) * 100))}%</span>
            </div>
            <div className="mt-3 w-full h-2 bg-slate-700 rounded">
              <div className="h-2 bg-blue-600 rounded" style={{ width: `${Math.min(100, (dbSize / dbMax) * 100)}%` }}></div>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              <span>Used: {(dbSize / (1024*1024)).toFixed(1)}MB</span>
              <span className="mx-2">/</span>
              <span>Limit: {(dbMax / (1024*1024)).toFixed(1)}MB</span>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="bi bi-speedometer2 text-emerald-500"></i>
                <span className="font-bold">DB Response Time</span>
              </div>
              <span className="text-xs font-bold text-slate-300">
                {dbLatencySeries.length ? `${Math.round(dbLatencySeries.reduce((a,b)=>a+b,0)/dbLatencySeries.length)}ms avg` : '—'}
              </span>
            </div>
            {renderLatencyBar(dbLatencySeries)}
          </div>

          <div className="bg-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="bi bi-speedometer text-emerald-500"></i>
                <span className="font-bold">API Response Time</span>
              </div>
              <span className="text-xs font-bold text-slate-300">
                {apiLatencySeries.length ? `${Math.round(apiLatencySeries.reduce((a,b)=>a+b,0)/apiLatencySeries.length)}ms avg` : '—'}
              </span>
            </div>
            {renderLatencyBar(apiLatencySeries)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusPage
