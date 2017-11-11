"use strict";

$(document).ready(function () {
    $('body').sectionScroll({
        topOffset: 80
    });

    (function(){
        let rand = new Date().getTime();
        d3.json(`partidos.json?r=${rand}`, function(data){
            var partidos = data;
            initSlider(partidos);
            d3.json(`partidos_anio.json?r=${rand}`, function(data){
                var partidos_anio = data;
                drawLines(partidos_anio);
                $(".filter ul span").bind("click", function(){
                    $($(this).siblings()[0]).click();
                });

                let debouncedFilter = _.debounce(function(){
                    $('#overlay').show()
                    var filtro = filtrarPartidos(partidos)
                    console.log(filtro);
                    setTimeout(() =>$('#overlay').hide(), 1000);
                }, 1000);

                $("input:checkbox").bind('click', debouncedFilter);
                $("#anio_slider").on('slide', debouncedFilter);
                /*var data = [
                    {"value": 100, "name": "alpha"},
                    {"value": 70, "name": "beta"},
                    {"value": 40, "name": "gamma"},
                    {"value": 15, "name": "delta"},
                    {"value": 5, "name": "epsilon"},
                    {"value": 1, "name": "zeta"}
                  ]
                  d3plus.viz()
                    .container("#viz")
                    .data(data)
                    .type("pie")
                    .id("name")
                    .size("value")
                    .height(400) // IMPORTANTE!!  Bootstrap is setting min-height: 1px on the "col-md-8" div. This causes the auto-height detection in D3plus to use that as it's height.
                    .width(800)
                    .draw();*/


            });
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

        function drawLines(data) {
            console.log(data);

            d3plus.viz()
            .container("#viz")
            .data(data)
            .type("line")
            .id("anio")
            .y("total")
            .x("anio")
            .height(400) // IMPORTANTE!!  Bootstrap is setting min-height: 1px on the "col-md-8" div. This causes the auto-height detection in D3plus to use that as it's height.
            .width(800)
            .draw()
        }
    })()

});