"use strict";

(function(){
    let rand = new Date().getTime();
    d3.json(`partidos.json?r=${rand}`, function(data){
        var partidos = data;
        d3.json(`partidos_anio.json?r=${rand}`, function(data){
            var partidos_anio = data;
            drawLines(partidos_anio);
            var fn_selected_checkbox_values = function(selector) {
                return $(selector).map(function(){
                    return $(this).val();
                }).get();
            }
            $(".filter ul span").bind("click", function(){
                $($(this).siblings()[0]).click();
            });
            $("input:checkbox").bind('click', _.debounce(function(){
                console.log("RELOADING...");
                var filtro = _.chain(partidos)
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
                .value();
                console.log(filtro);
            }, 1000));

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