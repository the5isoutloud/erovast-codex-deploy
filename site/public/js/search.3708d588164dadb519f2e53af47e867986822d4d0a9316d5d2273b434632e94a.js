(() => {
  // ns-hugo-imp:/project/site/assets/js/vendor/fuse.basic.min.mjs
  function e(e2) {
    return Array.isArray ? Array.isArray(e2) : u(e2) === `[object Array]`;
  }
  function t(e2) {
    if (typeof e2 == `string`) return e2;
    if (typeof e2 == `bigint`) return e2.toString();
    let t2 = e2 + ``;
    return t2 == `0` && 1 / e2 == -1 / 0 ? `-0` : t2;
  }
  function n(e2) {
    return e2 == null ? `` : t(e2);
  }
  function r(e2) {
    return typeof e2 == `string`;
  }
  function i(e2) {
    return typeof e2 == `number`;
  }
  function a(e2) {
    return e2 === true || e2 === false || s(e2) && u(e2) == `[object Boolean]`;
  }
  function o(e2) {
    return typeof e2 == `object`;
  }
  function s(e2) {
    return o(e2) && e2 !== null;
  }
  function c(e2) {
    return e2 != null;
  }
  function l(e2) {
    return !e2.trim().length;
  }
  function u(e2) {
    return e2 == null ? e2 === void 0 ? `[object Undefined]` : `[object Null]` : Object.prototype.toString.call(e2);
  }
  var d = `Invalid doc index: must be a non-negative integer within the bounds of the docs array`;
  var f = (e2) => `Pattern length exceeds max of ${e2}.`;
  var p = (e2) => `Missing ${e2} property in key`;
  var m = (e2) => `Property 'weight' in key '${e2}' must be a positive integer`;
  var h = Object.prototype.hasOwnProperty;
  var g = class {
    constructor(e2) {
      this._keys = [], this._keyMap = {};
      let t2 = 0;
      e2.forEach((e3) => {
        let n2 = _(e3);
        this._keys.push(n2), this._keyMap[n2.id] = n2, t2 += n2.weight;
      }), this._keys.forEach((e3) => {
        e3.weight /= t2;
      });
    }
    get(e2) {
      return this._keyMap[e2];
    }
    keys() {
      return this._keys;
    }
    toJSON() {
      return JSON.stringify(this._keys);
    }
  };
  function _(t2) {
    var _a;
    let n2 = null, i2 = null, a2 = null, o2 = 1, s2 = null;
    if (r(t2) || e(t2)) a2 = t2, n2 = v(t2), i2 = y(t2);
    else {
      if (!h.call(t2, `name`)) throw Error(p(`name`));
      let e2 = t2.name;
      if (a2 = e2, h.call(t2, `weight`) && t2.weight !== void 0 && (o2 = t2.weight, o2 <= 0)) throw Error(m(y(e2)));
      n2 = v(e2), i2 = y(e2), s2 = (_a = t2.getFn) != null ? _a : null;
    }
    return { path: n2, id: i2, weight: o2, src: a2, getFn: s2 };
  }
  function v(t2) {
    return e(t2) ? t2 : t2.split(`.`);
  }
  function y(t2) {
    return e(t2) ? t2.join(`.`) : t2;
  }
  function b(t2, o2) {
    let s2 = [], l2 = false, u2 = (t3, o3, d2, f2) => {
      if (c(t3)) if (!o3[d2]) s2.push(f2 === void 0 ? t3 : { v: t3, i: f2 });
      else {
        let p2 = t3[o3[d2]];
        if (!c(p2)) return;
        if (d2 === o3.length - 1 && (r(p2) || i(p2) || a(p2) || typeof p2 == `bigint`)) s2.push(f2 === void 0 ? n(p2) : { v: n(p2), i: f2 });
        else if (e(p2)) {
          l2 = true;
          for (let e2 = 0, t4 = p2.length; e2 < t4; e2 += 1) u2(p2[e2], o3, d2 + 1, e2);
        } else o3.length && u2(p2, o3, d2 + 1, f2);
      }
    };
    return u2(t2, r(o2) ? o2.split(`.`) : o2, 0), l2 ? s2 : s2[0];
  }
  var x = { includeMatches: false, findAllMatches: false, minMatchCharLength: 1 };
  var S = { isCaseSensitive: false, ignoreDiacritics: false, includeScore: false, keys: [], shouldSort: true, sortFn: (e2, t2) => e2.score === t2.score ? e2.idx < t2.idx ? -1 : 1 : e2.score < t2.score ? -1 : 1 };
  var C = { location: 0, threshold: 0.6, distance: 100 };
  var w = { useExtendedSearch: false, useTokenSearch: false, tokenize: void 0, tokenMatch: `any`, getFn: b, ignoreLocation: false, ignoreFieldNorm: false, fieldNormWeight: 1 };
  var T = Object.freeze({ ...S, ...x, ...C, ...w });
  function E(e2) {
    return e2 >= 9 && e2 <= 13 || e2 === 32 || e2 === 160;
  }
  function D(e2 = 1, t2 = 3) {
    let n2 = /* @__PURE__ */ new Map(), r2 = 10 ** t2;
    return { get(t3) {
      let i2 = 0, a2 = false;
      for (let e3 = 0; e3 < t3.length; e3++) E(t3.charCodeAt(e3)) ? a2 = false : a2 || (i2++, a2 = true);
      if (i2 === 0 && (i2 = 1), n2.has(i2)) return n2.get(i2);
      let o2 = Math.round(r2 / i2 ** (0.5 * e2)) / r2;
      return n2.set(i2, o2), o2;
    }, clear() {
      n2.clear();
    } };
  }
  var O = class {
    constructor({ getFn: e2 = T.getFn, fieldNormWeight: t2 = T.fieldNormWeight } = {}) {
      this.norm = D(t2, 3), this.getFn = e2, this.isCreated = false, this.docs = [], this.keys = [], this._keysMap = {}, this.setIndexRecords();
    }
    setSources(e2 = []) {
      this.docs = e2;
    }
    setIndexRecords(e2 = []) {
      this.records = e2;
    }
    setKeys(e2 = []) {
      this.keys = e2, this._keysMap = {}, e2.forEach((e3, t2) => {
        this._keysMap[e3.id] = t2;
      });
    }
    create() {
      if (this.isCreated || !this.docs.length) return;
      this.isCreated = true;
      let e2 = this.docs.length;
      this.records = Array(e2);
      let t2 = 0;
      if (r(this.docs[0])) for (let n2 = 0; n2 < e2; n2++) {
        let e3 = this._createStringRecord(this.docs[n2], n2);
        e3 && (this.records[t2++] = e3);
      }
      else for (let n2 = 0; n2 < e2; n2++) this.records[t2++] = this._createObjectRecord(this.docs[n2], n2);
      this.records.length = t2, this.norm.clear();
    }
    add(e2, t2) {
      if (!Number.isInteger(t2) || t2 < 0) throw Error(d);
      if (r(e2)) {
        let n3 = this._createStringRecord(e2, t2);
        return n3 && this.records.push(n3), n3;
      }
      let n2 = this._createObjectRecord(e2, t2);
      return this.records.push(n2), n2;
    }
    removeAt(e2) {
      if (!Number.isInteger(e2) || e2 < 0) throw Error(d);
      for (let t2 = 0, n2 = this.records.length; t2 < n2; t2 += 1) if (this.records[t2].i === e2) {
        this.records.splice(t2, 1);
        break;
      }
      for (let t2 = 0, n2 = this.records.length; t2 < n2; t2 += 1) this.records[t2].i > e2 && --this.records[t2].i;
    }
    removeAll(e2) {
      let t2 = /* @__PURE__ */ new Set();
      for (let n3 of e2) Number.isInteger(n3) && n3 >= 0 && t2.add(n3);
      if (t2.size === 0) return;
      this.records = this.records.filter((e3) => !t2.has(e3.i));
      let n2 = Array.from(t2).sort((e3, t3) => e3 - t3);
      for (let e3 of this.records) {
        let t3 = 0, r2 = n2.length;
        for (; t3 < r2; ) {
          let i2 = t3 + r2 >>> 1;
          n2[i2] < e3.i ? t3 = i2 + 1 : r2 = i2;
        }
        e3.i -= t3;
      }
    }
    getValueForItemAtKeyId(e2, t2) {
      return e2[this._keysMap[t2]];
    }
    size() {
      return this.records.length;
    }
    _createStringRecord(e2, t2) {
      return !c(e2) || l(e2) ? null : { v: e2, i: t2, n: this.norm.get(e2) };
    }
    _createObjectRecord(t2, i2) {
      let a2 = { i: i2, $: {} };
      for (let i3 = 0, o2 = this.keys.length; i3 < o2; i3++) {
        let o3 = this.keys[i3], s2 = o3.getFn ? o3.getFn(t2) : this.getFn(t2, o3.path);
        if (c(s2)) {
          if (e(s2)) {
            let e2 = [];
            for (let t3 = 0, i4 = s2.length; t3 < i4; t3 += 1) {
              let i5 = s2[t3];
              if (c(i5)) {
                if (r(i5)) {
                  if (!l(i5)) {
                    let n2 = { v: i5, i: t3, n: this.norm.get(i5) };
                    e2.push(n2);
                  }
                } else if (c(i5.v)) {
                  let t4 = r(i5.v) ? i5.v : n(i5.v);
                  if (!l(t4)) {
                    let n2 = { v: t4, i: i5.i, n: this.norm.get(t4) };
                    e2.push(n2);
                  }
                }
              }
            }
            a2.$[i3] = e2;
          } else if (r(s2) && !l(s2)) {
            let e2 = { v: s2, n: this.norm.get(s2) };
            a2.$[i3] = e2;
          }
        }
      }
      return a2;
    }
    toJSON() {
      return { keys: this.keys.map(({ getFn: e2, ...t2 }) => t2), records: this.records };
    }
  };
  function k(e2, t2, { getFn: n2 = T.getFn, fieldNormWeight: r2 = T.fieldNormWeight } = {}) {
    let i2 = new O({ getFn: n2, fieldNormWeight: r2 });
    return i2.setKeys(e2.map(_)), i2.setSources(t2), i2.create(), i2;
  }
  function A(e2, { getFn: t2 = T.getFn, fieldNormWeight: n2 = T.fieldNormWeight } = {}) {
    let { keys: r2, records: i2 } = e2, a2 = new O({ getFn: t2, fieldNormWeight: n2 });
    return a2.setKeys(r2), a2.setIndexRecords(i2), a2;
  }
  function j(e2 = [], t2 = T.minMatchCharLength) {
    let n2 = [], r2 = -1, i2 = -1, a2 = 0;
    for (let o2 = e2.length; a2 < o2; a2 += 1) {
      let o3 = e2[a2];
      o3 && r2 === -1 ? r2 = a2 : !o3 && r2 !== -1 && (i2 = a2 - 1, i2 - r2 + 1 >= t2 && n2.push([r2, i2]), r2 = -1);
    }
    return e2[a2 - 1] && a2 - r2 >= t2 && n2.push([r2, a2 - 1]), n2;
  }
  function M(e2, t2, n2, { location: r2 = T.location, distance: i2 = T.distance, threshold: a2 = T.threshold, findAllMatches: o2 = T.findAllMatches, minMatchCharLength: s2 = T.minMatchCharLength, includeMatches: c2 = T.includeMatches, ignoreLocation: l2 = T.ignoreLocation } = {}) {
    if (t2.length > 32) throw Error(f(32));
    let u2 = t2.length, d2 = e2.length, p2 = Math.max(0, Math.min(r2, d2)), m2 = a2, h2 = p2, g2 = (e3, t3) => {
      let n3 = e3 / u2;
      if (l2) return n3;
      let r3 = Math.abs(p2 - t3);
      return i2 ? n3 + r3 / i2 : r3 ? 1 : n3;
    }, _2 = s2 > 1 || c2, v2 = _2 ? Array(d2) : [], y2;
    for (; (y2 = e2.indexOf(t2, h2)) > -1; ) {
      let e3 = g2(0, y2);
      if (m2 = Math.min(e3, m2), h2 = y2 + u2, _2) {
        let e4 = 0;
        for (; e4 < u2; ) v2[y2 + e4] = 1, e4 += 1;
      }
    }
    h2 = -1;
    let b2 = [], x2 = 1, S2 = 0, C2 = u2 + d2, w2 = 1 << u2 - 1;
    for (let t3 = 0; t3 < u2; t3 += 1) {
      let r3 = 0, i3 = C2;
      for (; r3 < i3; ) g2(t3, p2 + i3) <= m2 ? r3 = i3 : C2 = i3, i3 = Math.floor((C2 - r3) / 2 + r3);
      C2 = i3;
      let a3 = Math.max(1, p2 - i3 + 1), s3 = o2 ? d2 : Math.min(p2 + i3, d2) + u2, c3 = Array(s3 + 2);
      c3[s3 + 1] = (1 << t3) - 1;
      for (let r4 = s3; r4 >= a3; --r4) {
        let i4 = r4 - 1, o3 = n2[e2[i4]];
        if (c3[r4] = (c3[r4 + 1] << 1 | 1) & o3, t3 && (c3[r4] |= (b2[r4 + 1] | b2[r4]) << 1 | 1 | b2[r4 + 1]), c3[r4] & w2 && (x2 = g2(t3, i4), x2 <= m2)) {
          if (m2 = x2, h2 = i4, S2 = t3, h2 <= p2) break;
          a3 = Math.max(1, 2 * p2 - h2);
        }
      }
      if (g2(t3 + 1, p2) > m2) break;
      b2 = c3;
    }
    if (_2 && h2 >= 0) {
      let t3 = Math.min(d2 - 1, h2 + u2 - 1 + S2);
      for (let r3 = h2; r3 <= t3; r3 += 1) n2[e2[r3]] && (v2[r3] = 1);
    }
    let E2 = { isMatch: h2 >= 0, score: Math.max(1e-3, x2) };
    if (_2) {
      let e3 = j(v2, s2);
      e3.length ? c2 && (E2.indices = e3) : E2.isMatch = false;
    }
    return E2;
  }
  function N(e2) {
    let t2 = {};
    for (let n2 = 0, r2 = e2.length; n2 < r2; n2 += 1) {
      let i2 = e2.charAt(n2);
      t2[i2] = (t2[i2] || 0) | 1 << r2 - n2 - 1;
    }
    return t2;
  }
  function P(e2) {
    if (e2.length <= 1) return e2;
    e2.sort((e3, t3) => e3[0] - t3[0] || e3[1] - t3[1]);
    let t2 = [e2[0]];
    for (let n2 = 1, r2 = e2.length; n2 < r2; n2 += 1) {
      let r3 = t2[t2.length - 1], i2 = e2[n2];
      i2[0] <= r3[1] + 1 ? r3[1] = Math.max(r3[1], i2[1]) : t2.push(i2);
    }
    return t2;
  }
  var F = { \u0142: `l`, \u0141: `L`, \u0111: `d`, \u0110: `D`, \u00F8: `o`, \u00D8: `O`, \u0127: `h`, \u0126: `H`, \u0167: `t`, \u0166: `T`, \u0131: `i`, \u00DF: `ss` };
  var I = RegExp(`[` + Object.keys(F).join(``) + `]`, `g`);
  var L = typeof String.prototype.normalize == `function` ? (e2) => e2.normalize(`NFD`).replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g, ``).replace(I, (e3) => F[e3]) : (e2) => e2;
  var R = class {
    constructor(e2, { location: t2 = T.location, threshold: n2 = T.threshold, distance: r2 = T.distance, includeMatches: i2 = T.includeMatches, findAllMatches: a2 = T.findAllMatches, minMatchCharLength: o2 = T.minMatchCharLength, isCaseSensitive: s2 = T.isCaseSensitive, ignoreDiacritics: c2 = T.ignoreDiacritics, ignoreLocation: l2 = T.ignoreLocation } = {}) {
      if (this.options = { location: t2, threshold: n2, distance: r2, includeMatches: i2, findAllMatches: a2, minMatchCharLength: o2, isCaseSensitive: s2, ignoreDiacritics: c2, ignoreLocation: l2 }, e2 = s2 ? e2 : e2.toLowerCase(), e2 = c2 ? L(e2) : e2, this.pattern = e2, this.chunks = [], !this.pattern.length) return;
      let u2 = (e3, t3) => {
        this.chunks.push({ pattern: e3, alphabet: N(e3), startIndex: t3 });
      }, d2 = this.pattern.length;
      if (d2 > 32) {
        let e3 = 0, t3 = d2 % 32, n3 = d2 - t3;
        for (; e3 < n3; ) u2(this.pattern.substr(e3, 32), e3), e3 += 32;
        if (t3) {
          let e4 = d2 - 32;
          u2(this.pattern.substr(e4), e4);
        }
      } else u2(this.pattern, 0);
    }
    searchIn(e2) {
      let { isCaseSensitive: t2, ignoreDiacritics: n2, includeMatches: r2 } = this.options;
      if (e2 = t2 ? e2 : e2.toLowerCase(), e2 = n2 ? L(e2) : e2, this.pattern === e2) {
        if (e2.length < this.options.minMatchCharLength) return { isMatch: false, score: 1 };
        let t3 = { isMatch: true, score: 0 };
        return r2 && (t3.indices = [[0, e2.length - 1]]), t3;
      }
      let { location: i2, distance: a2, threshold: o2, findAllMatches: s2, minMatchCharLength: c2, ignoreLocation: l2 } = this.options, u2 = [], d2 = 0, f2 = false;
      this.chunks.forEach(({ pattern: t3, alphabet: n3, startIndex: p3 }) => {
        let { isMatch: m2, score: h2, indices: g2 } = M(e2, t3, n3, { location: i2 + p3, distance: a2, threshold: o2, findAllMatches: s2, minMatchCharLength: c2, includeMatches: r2, ignoreLocation: l2 });
        m2 && (f2 = true), d2 += h2, m2 && g2 && u2.push(...g2);
      });
      let p2 = { isMatch: f2, score: f2 ? d2 / this.chunks.length : 1 };
      return f2 && r2 && (p2.indices = P(u2)), p2;
    }
  };
  var z = [];
  function B(...e2) {
    z.push(...e2);
  }
  function V(e2, t2) {
    for (let n2 = 0, r2 = z.length; n2 < r2; n2 += 1) {
      let r3 = z[n2];
      if (r3.condition(e2, t2)) return new r3(e2, t2);
    }
    return new R(e2, t2);
  }
  function H(e2, { ignoreFieldNorm: t2 = T.ignoreFieldNorm }) {
    let n2 = 1;
    return e2.forEach(({ key: e3, norm: r2, score: i2 }) => {
      let a2 = e3 ? e3.weight : null;
      n2 *= (i2 === 0 && a2 ? 2 ** -52 : i2) ** +((a2 || 1) * (t2 ? 1 : r2));
    }), n2;
  }
  function U(e2, { ignoreFieldNorm: t2 = T.ignoreFieldNorm }) {
    e2.forEach((e3) => {
      e3.score = H(e3.matches, { ignoreFieldNorm: t2 });
    });
  }
  var W = class {
    constructor(e2, t2) {
      this.limit = e2, this.heap = [], this.comparator = t2;
    }
    get size() {
      return this.heap.length;
    }
    insert(e2) {
      this.size < this.limit ? (this.heap.push(e2), this._bubbleUp(this.size - 1)) : this.comparator(e2, this.heap[0]) < 0 && (this.heap[0] = e2, this._sinkDown(0));
    }
    extractSorted() {
      return this.heap.sort(this.comparator);
    }
    _bubbleUp(e2) {
      let t2 = this.heap;
      for (; e2 > 0; ) {
        let n2 = e2 - 1 >> 1;
        if (this.comparator(t2[e2], t2[n2]) <= 0) break;
        let r2 = t2[e2];
        t2[e2] = t2[n2], t2[n2] = r2, e2 = n2;
      }
    }
    _sinkDown(e2) {
      let t2 = this.heap, n2 = t2.length, r2 = e2;
      do {
        e2 = r2;
        let i2 = 2 * e2 + 1, a2 = 2 * e2 + 2;
        if (i2 < n2 && this.comparator(t2[i2], t2[r2]) > 0 && (r2 = i2), a2 < n2 && this.comparator(t2[a2], t2[r2]) > 0 && (r2 = a2), r2 !== e2) {
          let n3 = t2[e2];
          t2[e2] = t2[r2], t2[r2] = n3;
        }
      } while (r2 !== e2);
    }
  };
  function G(e2) {
    let t2 = [];
    return e2.matches.forEach((e3) => {
      if (!c(e3.indices) || !e3.indices.length) return;
      let n2 = { indices: e3.indices, value: e3.value };
      e3.key && (n2.key = e3.key.id), e3.idx > -1 && (n2.refIndex = e3.idx), t2.push(n2);
    }), t2;
  }
  function K(e2, t2, { includeMatches: n2 = T.includeMatches, includeScore: r2 = T.includeScore } = {}) {
    return e2.map((e3) => {
      let { idx: i2 } = e3, a2 = { item: t2[i2], refIndex: i2 };
      return n2 && (a2.matches = G(e3)), r2 && (a2.score = e3.score), a2;
    });
  }
  var q = /[\p{L}\p{M}\p{N}_]+/gu;
  function J(e2) {
    return typeof e2 == `function` ? (t2) => e2(t2) : e2 instanceof RegExp ? (e2.global, (t2) => t2.match(e2) || []) : (e3) => e3.match(q) || [];
  }
  function Y({ isCaseSensitive: e2 = false, ignoreDiacritics: t2 = false, tokenize: n2 } = {}) {
    let r2 = J(n2);
    return { tokenize(n3) {
      return e2 || (n3 = n3.toLowerCase()), t2 && (n3 = L(n3)), r2(n3);
    } };
  }
  function X(e2, t2, n2, r2) {
    let i2 = r2.tokenize(t2);
    if (!i2.length) return;
    e2.fieldCount++, e2.docFieldCount.set(n2, (e2.docFieldCount.get(n2) || 0) + 1);
    let a2 = new Set(i2), o2 = e2.docTermFieldHits.get(n2);
    o2 || (o2 = /* @__PURE__ */ new Map(), e2.docTermFieldHits.set(n2, o2));
    for (let t3 of a2) o2.set(t3, (o2.get(t3) || 0) + 1), e2.df.set(t3, (e2.df.get(t3) || 0) + 1);
  }
  function Z(e2, t2, n2, r2) {
    let { i: i2, v: a2, $: o2 } = t2;
    if (a2 !== void 0) {
      X(e2, a2, i2, r2);
      return;
    }
    if (o2) for (let t3 = 0; t3 < n2; t3++) {
      let n3 = o2[t3];
      if (n3) if (Array.isArray(n3)) for (let t4 of n3) X(e2, t4.v, i2, r2);
      else X(e2, n3.v, i2, r2);
    }
  }
  function ee(e2, t2, n2) {
    let r2 = { fieldCount: 0, df: /* @__PURE__ */ new Map(), docFieldCount: /* @__PURE__ */ new Map(), docTermFieldHits: /* @__PURE__ */ new Map() };
    for (let i2 of e2) Z(r2, i2, t2, n2);
    return r2;
  }
  function te(e2, t2, n2, r2) {
    Z(e2, t2, n2, r2);
  }
  function ne(e2, t2) {
    let n2 = e2.docFieldCount.get(t2);
    if (n2 === void 0) return;
    e2.fieldCount -= n2, e2.docFieldCount.delete(t2);
    let r2 = e2.docTermFieldHits.get(t2);
    if (r2) {
      for (let [t3, n3] of r2) {
        let r3 = (e2.df.get(t3) || 0) - n3;
        r3 <= 0 ? e2.df.delete(t3) : e2.df.set(t3, r3);
      }
      e2.docTermFieldHits.delete(t2);
    }
  }
  function Q(e2, t2) {
    if (t2.length === 0) return;
    let n2 = Array.from(new Set(t2)).sort((e3, t3) => e3 - t3);
    for (let t3 of n2) ne(e2, t3);
    let r2 = (e3) => {
      let t3 = 0, r3 = n2.length;
      for (; t3 < r3; ) {
        let i3 = t3 + r3 >>> 1;
        n2[i3] < e3 ? t3 = i3 + 1 : r3 = i3;
      }
      return e3 - t3;
    }, i2 = n2[0], a2 = /* @__PURE__ */ new Map();
    for (let [t3, n3] of e2.docFieldCount) a2.set(t3 > i2 ? r2(t3) : t3, n3);
    e2.docFieldCount = a2;
    let o2 = /* @__PURE__ */ new Map();
    for (let [t3, n3] of e2.docTermFieldHits) o2.set(t3 > i2 ? r2(t3) : t3, n3);
    e2.docTermFieldHits = o2;
  }
  var $ = class {
    constructor(e2, t2, n2) {
      if (this.options = { ...T, ...t2 }, this.options.useExtendedSearch) throw Error(`Extended search is not available`);
      if (this.options.useTokenSearch) throw Error(`Token search is not available`);
      this._keyStore = new g(this.options.keys), this._docs = e2, this._myIndex = null, this._invertedIndex = null, this.setCollection(e2, n2), this._lastQuery = null, this._lastSearcher = null;
    }
    _getSearcher(e2) {
      if (this._lastQuery === e2) return this._lastSearcher;
      let t2 = V(e2, this._invertedIndex ? { ...this.options, _invertedIndex: this._invertedIndex } : this.options);
      return this._lastQuery = e2, this._lastSearcher = t2, t2;
    }
    setCollection(e2, t2) {
      if (this._docs = e2, t2 && !(t2 instanceof O)) throw Error(`Incorrect 'index' type`);
      if (this._myIndex = t2 || k(this.options.keys, this._docs, { getFn: this.options.getFn, fieldNormWeight: this.options.fieldNormWeight }), this.options.useTokenSearch) {
        let e3 = Y({ isCaseSensitive: this.options.isCaseSensitive, ignoreDiacritics: this.options.ignoreDiacritics, tokenize: this.options.tokenize });
        this._invertedIndex = ee(this._myIndex.records, this._myIndex.keys.length, e3);
      }
      this._invalidateSearcherCache();
    }
    add(e2) {
      if (!c(e2)) return;
      this._docs.push(e2);
      let t2 = this._myIndex.add(e2, this._docs.length - 1);
      if (this._invertedIndex && t2) {
        let e3 = Y({ isCaseSensitive: this.options.isCaseSensitive, ignoreDiacritics: this.options.ignoreDiacritics, tokenize: this.options.tokenize });
        te(this._invertedIndex, t2, this._myIndex.keys.length, e3);
      }
      this._invalidateSearcherCache();
    }
    remove(e2 = () => false) {
      let t2 = [], n2 = [];
      for (let r2 = 0, i2 = this._docs.length; r2 < i2; r2 += 1) e2(this._docs[r2], r2) && (t2.push(this._docs[r2]), n2.push(r2));
      if (n2.length) {
        this._invertedIndex && Q(this._invertedIndex, n2);
        let e3 = new Set(n2);
        this._docs = this._docs.filter((t3, n3) => !e3.has(n3)), this._myIndex.removeAll(n2), this._invalidateSearcherCache();
      }
      return t2;
    }
    removeAt(e2) {
      if (!Number.isInteger(e2) || e2 < 0 || e2 >= this._docs.length) throw Error(d);
      this._invertedIndex && Q(this._invertedIndex, [e2]);
      let t2 = this._docs.splice(e2, 1)[0];
      return this._myIndex.removeAt(e2), this._invalidateSearcherCache(), t2;
    }
    _invalidateSearcherCache() {
      this._lastQuery = null, this._lastSearcher = null;
    }
    getIndex() {
      return this._myIndex;
    }
    _normalizedKeys() {
      return this._myIndex.keys.map((e2) => this._keyStore.get(e2.id) || e2);
    }
    search(e2, t2) {
      let { limit: n2 = -1 } = t2 || {}, { includeMatches: a2, includeScore: o2, shouldSort: s2, sortFn: c2, ignoreFieldNorm: l2 } = this.options;
      if (r(e2) && !e2.trim()) {
        let e3 = this._docs.map((e4, t3) => ({ item: e4, refIndex: t3 }));
        return i(n2) && n2 > -1 && (e3 = e3.slice(0, n2)), e3;
      }
      let u2 = s2 && i(n2) && n2 > 0 && r(e2), d2 = c2, f2 = (e3, t3) => d2(e3, t3) || e3.idx - t3.idx, p2;
      if (u2) {
        let t3 = new W(n2, f2);
        r(this._docs[0]) ? this._searchStringList(e2, { heap: t3, ignoreFieldNorm: l2 }) : this._searchObjectList(e2, { heap: t3, ignoreFieldNorm: l2 }), p2 = t3.extractSorted();
      } else p2 = r(e2) ? r(this._docs[0]) ? this._searchStringList(e2) : this._searchObjectList(e2) : this._searchLogical(e2), U(p2, { ignoreFieldNorm: l2 }), s2 && p2.sort(r(e2) ? f2 : d2), i(n2) && n2 > -1 && (p2 = p2.slice(0, n2));
      return K(p2, this._docs, { includeMatches: a2, includeScore: o2 });
    }
    _searchStringList(e2, { heap: t2, ignoreFieldNorm: n2 } = {}) {
      let r2 = this._getSearcher(e2), i2 = this.options.useTokenSearch && this.options.tokenMatch === `all`, { records: a2 } = this._myIndex, o2 = t2 ? null : [];
      return a2.forEach(({ v: e3, i: a3, n: s2 }) => {
        if (!c(e3)) return;
        let l2 = r2.searchIn(e3);
        if (l2.isMatch) {
          let r3 = { score: l2.score, value: e3, norm: s2, indices: l2.indices };
          i2 && (r3.matchedMask = l2.matchedMask, r3.matchedTerms = l2.matchedTerms, r3.termCount = l2.termCount);
          let c2 = [r3];
          if (!i2 || this._coversAllTokens(c2)) {
            let r4 = { item: e3, idx: a3, matches: c2 };
            t2 ? (r4.score = H(r4.matches, { ignoreFieldNorm: n2 }), t2.insert(r4)) : o2.push(r4);
          }
        }
      }), o2;
    }
    _searchLogical(e2) {
      throw Error(`Logical search is not available`);
    }
    _searchObjectList(e2, { heap: t2, ignoreFieldNorm: n2 } = {}) {
      let r2 = this._getSearcher(e2), i2 = this.options.useTokenSearch && this.options.tokenMatch === `all`, { records: a2 } = this._myIndex, o2 = this._normalizedKeys(), s2 = t2 ? null : [];
      return a2.forEach(({ $: e3, i: a3 }) => {
        if (!c(e3)) return;
        let l2 = [], u2 = false, d2 = false;
        if (o2.forEach((t3, n3) => {
          let i3 = this._findMatches({ key: t3, value: e3[n3], searcher: r2 });
          i3.length ? (l2.push(...i3), i3[0].hasInverse && (d2 = true)) : u2 = true;
        }), !(d2 && u2) && l2.length && (!i2 || this._coversAllTokens(l2))) {
          let r3 = { idx: a3, item: e3, matches: l2 };
          t2 ? (r3.score = H(r3.matches, { ignoreFieldNorm: n2 }), t2.insert(r3)) : s2.push(r3);
        }
      }), s2;
    }
    _findMatches({ key: t2, value: n2, searcher: r2 }) {
      if (!c(n2)) return [];
      let i2 = [];
      if (e(n2)) n2.forEach(({ v: e2, i: n3, n: a2 }) => {
        if (!c(e2)) return;
        let o2 = r2.searchIn(e2);
        if (o2.isMatch) {
          let r3 = { score: o2.score, key: t2, value: e2, idx: n3, norm: a2, indices: o2.indices, hasInverse: o2.hasInverse };
          o2.termCount !== void 0 && (r3.matchedMask = o2.matchedMask, r3.matchedTerms = o2.matchedTerms, r3.termCount = o2.termCount), i2.push(r3);
        }
      });
      else {
        let { v: e2, n: a2 } = n2, o2 = r2.searchIn(e2);
        if (o2.isMatch) {
          let n3 = { score: o2.score, key: t2, value: e2, norm: a2, indices: o2.indices, hasInverse: o2.hasInverse };
          o2.termCount !== void 0 && (n3.matchedMask = o2.matchedMask, n3.matchedTerms = o2.matchedTerms, n3.termCount = o2.termCount), i2.push(n3);
        }
      }
      return i2;
    }
    _coversAllTokens(e2) {
      let t2 = e2.length ? e2[0].termCount : void 0;
      if (t2 === void 0) return true;
      if (t2 <= 31) {
        let n3 = 0;
        for (let t3 = 0; t3 < e2.length; t3++) n3 |= e2[t3].matchedMask || 0;
        return n3 === 2 ** t2 - 1;
      }
      let n2 = /* @__PURE__ */ new Set();
      for (let t3 = 0; t3 < e2.length; t3++) {
        let r2 = e2[t3].matchedTerms;
        if (r2) for (let e3 of r2) n2.add(e3);
      }
      return n2.size === t2;
    }
  };
  $.version = `7.5.0`, $.createIndex = k, $.parseIndex = A, $.config = T, $.match = function(e2, t2, n2) {
    if (n2 && n2.useTokenSearch) throw Error(`Fuse.match does not support useTokenSearch: token search requires corpus-level statistics (df, fieldCount) that a one-off string comparison does not have. Use new Fuse(...).search(...) instead.`);
    return V(e2, { ...T, ...n2 }).searchIn(t2);
  }, $.use = function(...e2) {
    e2.forEach((e3) => B(e3));
  };
  var re = $;

  // <stdin>
  (function() {
    "use strict";
    var dialog = document.getElementById("search-dialog");
    if (!dialog || typeof dialog.showModal !== "function") return;
    var input = document.getElementById("search-input");
    var list = document.getElementById("search-results");
    var status = document.getElementById("search-status");
    var options = {};
    try {
      options = JSON.parse(dialog.getAttribute("data-options") || "{}");
    } catch (e2) {
    }
    var weights = options.weights || {};
    var limit = options.limit || 12;
    var minLength = options.minLength || 2;
    var fuse = null;
    var loading = null;
    var results = [];
    var active = -1;
    var timer = 0;
    var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    document.querySelectorAll("[data-search-shortcut]").forEach(function(el) {
      el.textContent = isMac ? "\u2318K" : "Ctrl K";
    });
    function norm(s2) {
      return String(s2 || "").replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
    }
    function escapeHTML(s2) {
      return String(s2).replace(/[&<>"']/g, function(c2) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c2];
      });
    }
    function load() {
      if (loading) return loading;
      loading = fetch(dialog.getAttribute("data-index")).then(function(r2) {
        if (!r2.ok) throw new Error(r2.status);
        return r2.json();
      }).then(function(items) {
        items.forEach(function(it) {
          it.t = norm(it.t);
          it.x = norm(it.x || "");
          it.a = (it.a || []).map(norm);
        });
        fuse = new re(items, {
          keys: [
            { name: "t", weight: weights.t },
            { name: "a", weight: weights.a },
            { name: "g", weight: weights.g },
            { name: "f", weight: weights.f },
            { name: "x", weight: weights.x }
          ],
          threshold: options.threshold,
          ignoreLocation: true,
          // match anywhere in long notes
          ignoreDiacritics: true,
          includeMatches: true,
          minMatchCharLength: minLength
        });
        if (input.value) search();
      }).catch(function() {
        loading = null;
        setStatus("Search couldn't load. Check your connection and try again.");
      });
      return loading;
    }
    function setStatus(text) {
      status.textContent = text;
      status.hidden = !text;
    }
    function highlight(text, ranges, offset) {
      offset = offset || 0;
      var out = "", pos = 0;
      ranges.map(function(r2) {
        return [r2[0] - offset, r2[1] - offset];
      }).filter(function(r2) {
        return r2[1] >= 0 && r2[0] < text.length;
      }).sort(function(a2, b2) {
        return a2[0] - b2[0];
      }).forEach(function(r2) {
        var s2 = Math.max(r2[0], pos), e2 = Math.min(r2[1], text.length - 1);
        if (e2 < s2) return;
        out += escapeHTML(text.slice(pos, s2)) + "<mark>" + escapeHTML(text.slice(s2, e2 + 1)) + "</mark>";
        pos = e2 + 1;
      });
      return out + escapeHTML(text.slice(pos));
    }
    function literalRanges(text, query) {
      var lower = text.toLowerCase(), ranges = [];
      var terms = [query.toLowerCase()].concat(query.toLowerCase().split(/\s+/).filter(function(w2) {
        return w2.length >= minLength;
      }));
      terms.forEach(function(term) {
        var i2 = lower.indexOf(term);
        while (i2 !== -1 && ranges.length < 20) {
          ranges.push([i2, i2 + term.length - 1]);
          i2 = lower.indexOf(term, i2 + term.length);
        }
      });
      return ranges;
    }
    function snippet(item, query, matches) {
      var text = item.x || "";
      if (!text) return "";
      var ranges = literalRanges(text, query);
      if (!ranges.length) {
        matches.forEach(function(m2) {
          if (m2.key === "x") m2.indices.forEach(function(r2) {
            if (r2[1] - r2[0] + 1 >= Math.max(3, query.length - 2)) ranges.push(r2);
          });
        });
      }
      var start = 0;
      if (ranges.length) {
        ranges.sort(function(a2, b2) {
          return a2[0] - b2[0];
        });
        start = Math.max(0, ranges[0][0] - 60);
        var space = text.lastIndexOf(" ", start);
        if (start > 0 && space > start - 20) start = space + 1;
      }
      var end = Math.min(text.length, start + 200);
      var body = highlight(text.slice(start, end), ranges, start);
      return (start > 0 ? "\u2026" : "") + body + (end < text.length ? "\u2026" : "");
    }
    function render(query) {
      active = results.length ? 0 : -1;
      if (!results.length) {
        list.innerHTML = "";
        setStatus("No results for \u201C" + query + "\u201D.");
        return;
      }
      setStatus("");
      list.innerHTML = results.map(function(r2, i2) {
        var it = r2.item;
        var titleRanges = [];
        var alias = "";
        (r2.matches || []).forEach(function(m2) {
          if (m2.key === "t") titleRanges = m2.indices;
          if (m2.key === "a" && !alias) alias = it.a[m2.refIndex];
        });
        var meta = [it.f].concat((it.g || []).map(function(g2) {
          return "#" + g2;
        })).filter(Boolean).join(" \xB7 ");
        return '<li role="option" id="search-opt-' + i2 + '"' + (i2 === 0 ? ' aria-selected="true" class="is-active"' : "") + '><a href="' + escapeHTML(it.u) + '"><span class="search-result-title">' + highlight(it.t, titleRanges) + (alias && literalRanges(alias, query).length ? ' <span class="search-result-alias">(' + escapeHTML(alias) + ")</span>" : "") + "</span>" + (meta ? '<span class="search-result-meta">' + escapeHTML(meta) + "</span>" : "") + '<span class="search-result-snippet">' + snippet(it, query, r2.matches || []) + "</span></a></li>";
      }).join("");
      input.setAttribute("aria-activedescendant", "search-opt-0");
    }
    function search() {
      var q2 = norm(input.value.trim());
      if (q2.length < minLength) {
        results = [];
        list.innerHTML = "";
        setStatus(q2 ? "Keep typing\u2026" : "Search names, places, factions, quests and session notes.");
        return;
      }
      if (!fuse) {
        setStatus("Loading\u2026");
        load();
        return;
      }
      results = fuse.search(q2, { limit });
      render(q2);
    }
    function move(delta) {
      var items = list.children;
      if (!items.length) return;
      if (active >= 0) {
        items[active].classList.remove("is-active");
        items[active].removeAttribute("aria-selected");
      }
      active = (active + delta + items.length) % items.length;
      items[active].classList.add("is-active");
      items[active].setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", items[active].id);
      items[active].scrollIntoView({ block: "nearest" });
    }
    function open() {
      if (dialog.open) return;
      dialog.showModal();
      document.documentElement.classList.add("search-open");
      input.select();
      search();
      load();
    }
    function close() {
      if (dialog.open) dialog.close();
    }
    dialog.addEventListener("close", function() {
      document.documentElement.classList.remove("search-open");
    });
    dialog.addEventListener("click", function(e2) {
      if (e2.target === dialog) close();
    });
    document.querySelectorAll("[data-search-open]").forEach(function(btn) {
      btn.addEventListener("click", open);
      btn.addEventListener("pointerenter", load, { once: true });
      btn.addEventListener("focus", load, { once: true });
    });
    document.querySelectorAll("[data-search-close]").forEach(function(btn) {
      btn.addEventListener("click", close);
    });
    input.addEventListener("input", function() {
      clearTimeout(timer);
      timer = setTimeout(search, 60);
    });
    input.addEventListener("keydown", function(e2) {
      if (e2.key === "ArrowDown") {
        e2.preventDefault();
        move(1);
      } else if (e2.key === "ArrowUp") {
        e2.preventDefault();
        move(-1);
      } else if (e2.key === "Enter") {
        var a2 = active >= 0 && list.children[active] && list.children[active].querySelector("a");
        if (a2) {
          e2.preventDefault();
          window.location.href = a2.href;
        }
      }
    });
    var initial = new URLSearchParams(window.location.search).get("search");
    if (initial) {
      input.value = initial;
      open();
    }
    document.addEventListener("keydown", function(e2) {
      if ((e2.key === "k" || e2.key === "K") && (e2.metaKey || e2.ctrlKey)) {
        e2.preventDefault();
        dialog.open ? close() : open();
        return;
      }
      if (e2.key === "/" && !dialog.open) {
        var t2 = e2.target;
        var typing = t2 && (t2.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t2.tagName));
        if (!typing) {
          e2.preventDefault();
          open();
        }
      }
    });
  })();
})();
