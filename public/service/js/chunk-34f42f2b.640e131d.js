(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["chunk-34f42f2b"],{"3abf":function(e,t,c){"use strict";var r=c("f42b"),i=c.n(r);i.a},"3de4":function(e,t,c){"use strict";var r=c("f5f7"),i=c.n(r);i.a},4906:function(e,t,c){},"631a":function(e,t,c){"use strict";c.r(t);var r=function(){var e=this,t=e.$createElement,c=e._self._c||t;return c("PageWrapper",{attrs:{title:"清理記錄",padding:".2rem"}},[c("div",{staticClass:"ClearRecordMain-Component"},[c("el-tabs",{model:{value:e.activeTab,callback:function(t){e.activeTab=t},expression:"activeTab"}},[c("el-tab-pane",{attrs:{label:"對話記錄",name:"talk-record"}},["talk-record"===e.activeTab?c("ClearTalkRecord"):e._e()],1),c("el-tab-pane",{attrs:{label:"登入記錄",name:"login"}},["login"===e.activeTab?c("ClearLoginRecord"):e._e()],1)],1)],1)])},i=[],n=c("d225"),o=c("308d"),a=c("6bb5"),l=c("4e2b"),s=c("9ab4"),d=c("60a3"),u=c("88c3"),f=function(){var e=this,t=e.$createElement,c=e._self._c||t;return c("div",{staticClass:"ClearTalkRecord-Component"},[c("div",{staticClass:"row"},[c("div",{staticClass:"col"},[c("form",{on:{submit:function(e){e.preventDefault()}}},[c("div",{staticClass:"row"},[c("div",{staticClass:"col"}),c("div",{staticClass:"col-auto"},[c("el-button",{attrs:{size:"mini",disabled:!e.canDelete,type:"danger"},on:{click:function(t){return t.preventDefault(),e.deleteConfirm()}}},[e._v("\n                            "+e._s(e._f("t")("common.clear"))+"\n                        ")]),c("el-button",{attrs:{size:"mini",loading:e.loading.reload},on:{click:function(t){return t.preventDefault(),e.reload()}}},[e._v("\n                            "+e._s(e._f("t")("common.search"))+"\n                        ")])],1)])]),c("div",{directives:[{name:"loading",rawName:"v-loading",value:e.loading.reload,expression:"loading.reload"}],staticClass:"list-group"},e._l(e.records,function(t){return c("div",{key:t.key,staticClass:"list-group-item list-group-item-action",class:{"bg-danger":t.checked,"text-white":t.checked,"text-primary":!t.checked},on:{click:function(e){e.preventDefault(),t.checked=!t.checked}}},[c("div",{staticClass:"row"},[c("div",{staticClass:"col-auto col-checked"},[c("input",{directives:[{name:"model",rawName:"v-model",value:t.checked,expression:"row.checked"}],staticClass:"form-check-input",attrs:{type:"checkbox"},domProps:{checked:Array.isArray(t.checked)?e._i(t.checked,null)>-1:t.checked},on:{click:function(e){e.stopPropagation()},change:function(c){var r=t.checked,i=c.target,n=!!i.checked;if(Array.isArray(r)){var o=null,a=e._i(r,o);i.checked?a<0&&e.$set(t,"checked",r.concat([o])):a>-1&&e.$set(t,"checked",r.slice(0,a).concat(r.slice(a+1)))}else e.$set(t,"checked",n)}}})]),c("div",{staticClass:"col-auto col-year"},[e._v(e._s(t.year)+" 年")]),c("div",{staticClass:"col-auto col-month"},[e._v(e._s(t.month)+" 月")]),c("div",{staticClass:"col"}),c("div",{staticClass:"col-auto col-count"},[e._v(e._s(t.count)+" 筆")])])])}),0)]),c("div",{staticClass:"col"})]),c("el-dialog",{attrs:{title:"提示",visible:e.confirm.visible,width:"50%"},on:{"update:visible":function(t){return e.$set(e.confirm,"visible",t)}}},[c("div",[c("div",{staticClass:"form-group form-check"},[c("input",{directives:[{name:"model",rawName:"v-model",value:e.confirm.deleted,expression:"confirm.deleted"}],staticClass:"form-check-input",attrs:{type:"checkbox",id:"confirm-delete"},domProps:{checked:Array.isArray(e.confirm.deleted)?e._i(e.confirm.deleted,null)>-1:e.confirm.deleted},on:{change:function(t){var c=e.confirm.deleted,r=t.target,i=!!r.checked;if(Array.isArray(c)){var n=null,o=e._i(c,n);r.checked?o<0&&e.$set(e.confirm,"deleted",c.concat([n])):o>-1&&e.$set(e.confirm,"deleted",c.slice(0,o).concat(c.slice(o+1)))}else e.$set(e.confirm,"deleted",i)}}}),c("label",{staticClass:"form-check-label text-danger confirm-message",attrs:{for:"confirm-delete"}},[e._v(e._s(e._f("pt")("confirm-delete-label")))])]),c("ul",e._l(e.checkedRecords,function(t){return c("li",{key:t.key},[c("span",{staticClass:"text-primary"},[e._v(e._s(t.year)+" / "+e._s(t.month)+" ")])])}),0)]),c("span",{staticClass:"dialog-footer",attrs:{slot:"footer"},slot:"footer"},[c("el-button",{attrs:{size:"mini"},on:{click:function(t){return e.closeConfirm()}}},[e._v("取消")]),c("el-button",{attrs:{size:"mini",disabled:!e.confirm.deleted,type:"danger"},on:{click:e.clearRecords}},[e._v("刪除")])],1)])],1)},m=[],v=(c("8e6e"),c("ac6a"),c("456d"),c("bd86")),h=c("b0b4"),p=c("7c04");function k(e,t){var c=Object.keys(e);return Object.getOwnPropertySymbols&&c.push.apply(c,Object.getOwnPropertySymbols(e)),t&&(c=c.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),c}function b(e){for(var t=1;t<arguments.length;t++){var c=null!=arguments[t]?arguments[t]:{};t%2?k(c,!0).forEach(function(t){Object(v["a"])(e,t,c[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(c)):k(c).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(c,t))})}return e}var g=Object(u["b"])("clear-talk-record"),y=function(e){function t(){var e;return Object(n["a"])(this,t),e=Object(o["a"])(this,Object(a["a"])(t).apply(this,arguments)),e.pt=g,e.loading={reload:!1,delete:!1},e.records=[],e.confirm={visible:!1,deleted:!1},e}return Object(l["a"])(t,e),Object(h["a"])(t,[{key:"mounted",value:function(){this.reload()}},{key:"reload",value:function(){var e=this;this.loading.reload||(this.loading.reload=!0,p["a"].get("/clear-record/talk-records").then(function(t){e.records=t.map(function(e){return b({},e,{key:e.key,checked:!1})})}).finally(function(){e.loading.reload=!1}))}},{key:"deleteConfirm",value:function(){this.confirm.visible=!0,this.confirm.deleted=!1}},{key:"closeConfirm",value:function(){this.confirm.visible=!1,this.confirm.deleted=!1}},{key:"clearRecords",value:function(){var e=this,t=this.checkedRecords.map(function(e){return{year:e.year,month:e.month}}),c={items:t};this.loading.delete||(this.loading.delete=!0,p["a"].post("/clear-record/talk-records/delete",{data:c}).then(function(){e.closeConfirm(),e.reload()}).finally(function(){e.loading.delete=!1}))}},{key:"title",get:function(){return""}},{key:"canDelete",get:function(){var e=this.loading.reload,t=this.records.filter(function(e){return e.checked}).length;return!e&&t>0}},{key:"checkedRecords",get:function(){return this.records.filter(function(e){return e.checked})}}]),t}(d["d"]);y=s["a"]([Object(d["a"])({filters:{pt:g}})],y);var C=y,_=C,O=(c("3de4"),c("2877")),j=Object(O["a"])(_,f,m,!1,null,"c2add756",null),w=j.exports,P=function(){var e=this,t=e.$createElement,c=e._self._c||t;return c("div",{staticClass:"ClearLogin-Component"},[c("div",{staticClass:"row"},[c("div",{staticClass:"col"},[c("form",{on:{submit:function(e){e.preventDefault()}}},[c("div",{staticClass:"row"},[c("div",{staticClass:"col"}),c("div",{staticClass:"col-auto"},[c("el-button",{attrs:{size:"mini",disabled:!e.canDelete,type:"danger"},on:{click:function(t){return t.preventDefault(),e.deleteConfirm()}}},[e._v("\n                            "+e._s(e._f("t")("common.clear"))+"\n                        ")]),c("el-button",{attrs:{size:"mini",loading:e.loading.reload},on:{click:function(t){return t.preventDefault(),e.reload()}}},[e._v("\n                            "+e._s(e._f("t")("common.search"))+"\n                        ")])],1)])]),c("div",{directives:[{name:"loading",rawName:"v-loading",value:e.loading.reload,expression:"loading.reload"}],staticClass:"list-group"},e._l(e.records,function(t){return c("div",{key:t.key,staticClass:"list-group-item list-group-item-action",class:{"bg-danger":t.checked,"text-white":t.checked,"text-primary":!t.checked},on:{click:function(e){e.preventDefault(),t.checked=!t.checked}}},[c("div",{staticClass:"row"},[c("div",{staticClass:"col-auto col-checked"},[c("input",{directives:[{name:"model",rawName:"v-model",value:t.checked,expression:"row.checked"}],staticClass:"form-check-input",attrs:{type:"checkbox"},domProps:{checked:Array.isArray(t.checked)?e._i(t.checked,null)>-1:t.checked},on:{click:function(e){e.stopPropagation()},change:function(c){var r=t.checked,i=c.target,n=!!i.checked;if(Array.isArray(r)){var o=null,a=e._i(r,o);i.checked?a<0&&e.$set(t,"checked",r.concat([o])):a>-1&&e.$set(t,"checked",r.slice(0,a).concat(r.slice(a+1)))}else e.$set(t,"checked",n)}}})]),c("div",{staticClass:"col-auto col-year"},[e._v(e._s(t.year)+" 年")]),c("div",{staticClass:"col-auto col-month"},[e._v(e._s(t.month)+" 月")]),c("div",{staticClass:"col"}),c("div",{staticClass:"col-auto col-count"},[e._v(e._s(t.count)+" 筆")])])])}),0)]),c("div",{staticClass:"col"})]),c("el-dialog",{attrs:{title:"提示",visible:e.confirm.visible,width:"50%"},on:{"update:visible":function(t){return e.$set(e.confirm,"visible",t)}}},[c("div",[c("div",{staticClass:"form-group form-check"},[c("input",{directives:[{name:"model",rawName:"v-model",value:e.confirm.deleted,expression:"confirm.deleted"}],staticClass:"form-check-input",attrs:{type:"checkbox",id:"confirm-delete"},domProps:{checked:Array.isArray(e.confirm.deleted)?e._i(e.confirm.deleted,null)>-1:e.confirm.deleted},on:{change:function(t){var c=e.confirm.deleted,r=t.target,i=!!r.checked;if(Array.isArray(c)){var n=null,o=e._i(c,n);r.checked?o<0&&e.$set(e.confirm,"deleted",c.concat([n])):o>-1&&e.$set(e.confirm,"deleted",c.slice(0,o).concat(c.slice(o+1)))}else e.$set(e.confirm,"deleted",i)}}}),c("label",{staticClass:"form-check-label text-danger confirm-message",attrs:{for:"confirm-delete"}},[e._v(e._s(e._f("pt")("confirm-delete-label")))])]),c("ul",e._l(e.checkedRecords,function(t){return c("li",{key:t.key},[c("span",{staticClass:"text-primary"},[e._v(e._s(t.year)+" / "+e._s(t.month)+" ")])])}),0)]),c("span",{staticClass:"dialog-footer",attrs:{slot:"footer"},slot:"footer"},[c("el-button",{attrs:{size:"mini"},on:{click:function(t){return e.closeConfirm()}}},[e._v("取消")]),c("el-button",{attrs:{size:"mini",disabled:!e.confirm.deleted,type:"danger"},on:{click:e.clearRecords}},[e._v("刪除")])],1)])],1)},x=[];function D(e,t){var c=Object.keys(e);return Object.getOwnPropertySymbols&&c.push.apply(c,Object.getOwnPropertySymbols(e)),t&&(c=c.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),c}function $(e){for(var t=1;t<arguments.length;t++){var c=null!=arguments[t]?arguments[t]:{};t%2?D(c,!0).forEach(function(t){Object(v["a"])(e,t,c[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(c)):D(c).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(c,t))})}return e}var A=Object(u["b"])("clear-talk-record"),R=function(e){function t(){var e;return Object(n["a"])(this,t),e=Object(o["a"])(this,Object(a["a"])(t).apply(this,arguments)),e.pt=A,e.loading={reload:!1,delete:!1},e.records=[],e.confirm={visible:!1,deleted:!1},e}return Object(l["a"])(t,e),Object(h["a"])(t,[{key:"mounted",value:function(){this.reload()}},{key:"reload",value:function(){var e=this;this.loading.reload||(this.loading.reload=!0,p["a"].get("/clear-record/login-records").then(function(t){e.records=t.map(function(e){return $({},e,{key:e.key,checked:!1})})}).finally(function(){e.loading.reload=!1}))}},{key:"deleteConfirm",value:function(){this.confirm.visible=!0,this.confirm.deleted=!1}},{key:"closeConfirm",value:function(){this.confirm.visible=!1,this.confirm.deleted=!1}},{key:"clearRecords",value:function(){var e=this,t=this.checkedRecords.map(function(e){return{year:e.year,month:e.month}}),c={items:t};this.loading.delete||(this.loading.delete=!0,p["a"].post("/clear-record/login-records/delete",{data:c}).then(function(){e.closeConfirm(),e.reload()}).finally(function(){e.loading.delete=!1}))}},{key:"title",get:function(){return""}},{key:"canDelete",get:function(){var e=this.loading.reload,t=this.records.filter(function(e){return e.checked}).length;return!e&&t>0}},{key:"checkedRecords",get:function(){return this.records.filter(function(e){return e.checked})}}]),t}(d["d"]);R=s["a"]([Object(d["a"])({filters:{pt:A}})],R);var T=R,z=T,E=(c("7e79"),Object(O["a"])(z,P,x,!1,null,"2db10f66",null)),N=E.exports,S=Object(u["b"])("clear-record-main"),L=function(e){function t(){var e;return Object(n["a"])(this,t),e=Object(o["a"])(this,Object(a["a"])(t).apply(this,arguments)),e.activeTab="talk-record",e}return Object(l["a"])(t,e),t}(d["d"]);L=s["a"]([Object(d["a"])({filters:{pt:S},components:{ClearTalkRecord:w,ClearLoginRecord:N}})],L);var J=L,M=J,W=(c("3abf"),Object(O["a"])(M,r,i,!1,null,"0e206491",null));t["default"]=W.exports},"7e79":function(e,t,c){"use strict";var r=c("4906"),i=c.n(r);i.a},f42b:function(e,t,c){},f5f7:function(e,t,c){}}]);