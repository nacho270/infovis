(function () {
    'use strict';
}());

//HELP: https://github.com/alexandersimoes/d3plus/wiki/Visualizations

$(document).ready(function () {
    $('body').sectionScroll({
        topOffset: 80
    });

    (function(){
        let rand = new Date().getTime();
        d3.json(`partidos.json?r=${rand}`, function(data){
            var partidos = data;
            initSlider(partidos);
            drawViz(partidos);
            $(".filter ul span").bind("click", function(){
                $($(this).siblings()[0]).click();
            });

            let debouncedFilter = _.debounce(function(){
                $('#overlay').show()
                var filtro = filtrarPartidos(partidos);
                console.log(filtro);
                $('#viz').html('');
                $('#viz2').html('');
                $('#viz3').html('');
                drawViz(filtro)
                setTimeout(() =>$('#overlay').hide(), 1000);
            }, 1000);

            $("input:checkbox").bind('click', debouncedFilter);
            $("#anio_slider").on('slide', debouncedFilter);
        });

        function filtrarPartidos(partidos) {
            var fn_selected_checkbox_values = function(selector) {
                return $(selector).map(function(){
                    return $(this).val();
                }).get();
            }
            return _.chain(partidos)
                .filter(p => {
                    let list = fn_selected_checkbox_values("#filter_condicion input:checkbox:checked");
                    return list.length == 0 || _.contains(list, p.condicion);
                })
                .filter(p => {
                    let list = fn_selected_checkbox_values("#filter_resultado input:checkbox:checked");
                    return list.length == 0 || _.contains(list, p.resultado);
                })
                .filter(p => {
                    let list = fn_selected_checkbox_values("#filter_torneo input:checkbox:checked");
                    return list.length == 0 || _.contains(list, p.tipo);
                })
                .filter(p => {
                    let anios = $('#anio_slider').slider("option", "values");
                    let anio = parseInt(p.anio);
                    return anio >= anios[0] && anio <= anios[1];
                })
                .value();
        }
        function initSlider(partidos) {
            let inicio =  parseInt(partidos[0].anio);
            let fin =  parseInt(partidos[partidos.length - 1].anio);
            var fnCreateAnioLabel = function (inicio, fin) {
                $("#value_slider").text(
                    " Desde " + inicio +
                    " - Hasta " + fin
                );
            }
            fnCreateAnioLabel(inicio, fin);
            $("#anio_slider").slider({
                range: true,
                min: inicio,
                max: fin,
                values: [inicio, fin],
                slide: function(event, ui) {
                    fnCreateAnioLabel(ui.values[0], ui.values[1]);
                }
            });
        }

        function drawViz(partidosFiltrados) {
            let series = [];
            let countPartidos = function(anio, resultado) {
                return _.chain(partidosFiltrados)
                    .filter(p => parseInt(p.anio) <= anio)
                    .filter(p => p.resultado === resultado)
                    .value().length;
            }
            let resultados = ["G", "E", "P"];
            let inicio = parseInt(partidosFiltrados[0].anio);
            let fin = parseInt(partidosFiltrados[partidosFiltrados.length - 1].anio);
            let statAnios = {
                arriba: 0,
                abajo: 0,
                igual: 0
            }
            for (let i = inicio; i <= fin; i++) {
                for(let j = 0; j < resultados.length; j++) {
                    series.push({
                        resultado: resultados[j],
                        anio: i.toString(),
                        valor: countPartidos(i, resultados[j])
                    })
                }
                var fGEP = function(serie) {
                    let g, e, p;
                    for(let i = 0; i < serie.length; i++) {
                        if(serie[i].resultado === "G") {
                            g = serie[i].valor;
                        } else if(serie[i].resultado === "E") {
                            e = serie[i].valor;
                        } else {
                            p = serie[i].valor;
                        }
                    }
                    return [g, e, p];
                };
                let s = series.slice(-3);
                var [ganados, empatados, perdidos] = fGEP(s);
                if (ganados > perdidos) {
                    statAnios.arriba = statAnios.arriba + 1;
                } else if(ganados === perdidos) {
                    statAnios.igual = statAnios.igual + 1;
                } else {
                    statAnios.abajo = statAnios.abajo + 1;
                }
            }

            d3plus.viz()
                .container("#viz")
                .data({
                    stroke: { "width": 3 },
                    value: series
                })
                .type("line")
                .id("resultado")
                .y("valor")
                .x("anio")
                .shape({
                    interpolate: 'monotone',
                    rendering: 'geometricPrecision'
                })
                .color(function(a) {
                    return a.resultado === 'G' ? '#0000FF' : a.resultado === 'P' ? '#FF0000' : '#cccccc';
                })
                .format("es_ES")
                .height(400) // IMPORTANTE!!  Bootstrap is setting min-height: 1px on the "col-md-8" div. This causes the auto-height detection in D3plus to use that as it's height.
                .draw()

            $('#stats').html(`A&ntilde;os arriba: ${statAnios.arriba} - A&ntilde;os iguales: ${statAnios.igual} - A&ntilde;os abajo: ${statAnios.abajo}`);

            var dataPie = series.slice(-3);
            d3plus.viz()
                .container("#viz2")
                .data(dataPie)
                .type("pie")
                .id("resultado")
                .size("valor")
                .format("es_ES")
                .color(function(a) {
                    return a.resultado === 'G' ? '#0000FF' : a.resultado === 'P' ? '#FF0000' : '#cccccc';
                })
                .legend({
                    align: "end",
                    data: true,
                    labels: true,
                    value: true
                })
                .height(400) // IMPORTANTE!!  Bootstrap is setting min-height: 1px on the "col-md-8" div. This causes the auto-height detection in D3plus to use that as it's height.
                .draw();
            var gep = fGEP(dataPie);
            $('#statsPie').html(`Ganados: ${gep[0]} - Empatados: ${gep[1]} - Perdidos: ${gep[2]}`);

            var groups = _.groupBy(partidosFiltrados, p => p.anio )
            var partidosPorAnio = _.map(groups, g => {
                return {
                    anio: g[0].anio,
                    name: "PARTIDOS",
                    value: g.length
                }
            });
            var totalPartidos = _.reduce(partidosPorAnio, (a, b) => a + b.value, 0);
            d3plus.viz()
                .container("#viz3")
                .data(partidosPorAnio)
                .type("stacked")
                .id("name")
                .text("name")
                .y("value")
                .x("anio")
                .format("es_ES")
                .height(400) // IMPORTANTE!!  Bootstrap is setting min-height: 1px on the "col-md-8" div. This causes the auto-height detection in D3plus to use that as it's height.
                .draw()
                $('#statsStack').text(`Total de partidos: ${totalPartidos}`);
        }
    })()

});