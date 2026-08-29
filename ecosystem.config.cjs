/**
 * PM2 — mantém o backend próprio no ar após reboots e falhas.
 *
 * Uma instância só: o host de funções guarda em memória quais processos Deno
 * estão rodando, e várias instâncias duplicariam esses processos.
 */
module.exports = {
  apps: [
    {
      name: "mro-api",
      cwd: __dirname + "/server",
      script: "npm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "20s",
      max_memory_restart: "1G",
      kill_timeout: 10000,
      env: { NODE_ENV: "production" },
      error_file: "/var/log/mro/api-error.log",
      out_file: "/var/log/mro/api-out.log",
      time: true,
    },
  ],
};
