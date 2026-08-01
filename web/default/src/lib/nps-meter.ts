/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useAuthStore } from "@/stores/auth-store";

const NPS_KEY = "e6da5062ad4111b1";

// 直接使用 npsmeter 官方注入脚本，不做任何改写。
// 仅将系统的 user_id / user_name 赋值到 npsmeter({...}) 调用中。
export function initNpsMeter() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const user = useAuthStore.getState().auth.user;
  const userId = user?.id != null ? String(user.id) : "";
  const userName = user?.display_name || user?.username || "";

  // 保持与官方脚本等价的类型：npsmeter 既是一个函数，又挂载队列属性 q
  const a = window as unknown as {
    npsmeter: ((...args: unknown[]) => void) & { q?: unknown[] };
    _npsSettings?: Record<string, string>;
  };
  const b = document;
  const c = "https://static.npsmeter.cn/npsmeter";
  const d = ".js?sv=";
  const e = b.getElementsByTagName("head")[0];
  const f = b.createElement("script");

  a.npsmeter =
    a.npsmeter ||
    function () {
      (a.npsmeter.q = a.npsmeter.q || []).push(arguments);
    };
  a._npsSettings = { npssv: "1.02" };

  f.async = true;
  f.src = c + d + a._npsSettings.npssv + "&npsid=" + a._npsSettings.npsid;
  e.appendChild(f);

  a.npsmeter({ key: NPS_KEY, user_id: userId, user_name: userName });
}
