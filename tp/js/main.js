(() => 'use strict'());

//HELP: https://github.com/alexandersimoes/d3plus/wiki/Visualizations

class App {

    constructor(partidos) {
        this.partidos = partidos;        
        this.colorResultado = {
            G: '#0000FF',
            P: '#FF0000',
            E: '#cccccc'
        };
    }

    init() {
        this.initSlider();
        this.initEvents();
        this.drawViz(this.partidos);        
    }

    resetViz() {
        $('#viz').html('');
        $('#viz2').html('');
        $('#viz3').html('');
        $('#viz4').html('');        
        $('#statsStack').text("");
        $('#stats').html("");
        $('#statsPie').html("");
        $('#statsPorcentaje').html("");
    }

    initEvents() {
        $(".filter ul span").bind("click", function(){
            $($(this).siblings()[0]).click();
        });
        let oThis = this;
        let debouncedFilter = _.debounce(function(){
            // $('#overlay').show()
            oThis.drawViz(oThis.filtrarPartidos(oThis.partidos))
            // setTimeout(() =>$('#overlay').hide(), 1000);
        }, 1000);
        $("input:checkbox").bind('click', debouncedFilter);
        $("#anio_slider").on('slide', debouncedFilter);
        $('#myModal').modal({ show: false})
    }

    createAnioLabel(inicio, fin) {
        $("#value_slider").text(
            " Desde " + inicio +
            " - Hasta " + fin
        );
    }

    initSlider() {
        let inicio =  parseInt(this.partidos[0].anio);
        let fin =  parseInt(this.partidos[this.partidos.length - 1].anio);
        let oThis = this;
        this.createAnioLabel(inicio, fin);
        $("#anio_slider").slider({
            range: true,
            min: inicio,
            max: fin,
            values: [inicio, fin],
            slide(event, ui) {
                oThis.createAnioLabel(ui.values[0], ui.values[1]);
            }
        });
        $( "#anio_slider .ui-slider-range" ).css('background', '#0c50a0');
    }
    
    getSelectedCheckboxValues(selector) {
        return $(selector).map(function(){
            return $(this).val();
        }).get();
    }
    
    filtrarPartidos(partidos) {
        return _.chain(partidos) //
            .filter(p => {
                let list = this.getSelectedCheckboxValues("#filter_condicion input:checkbox:checked");
                return list.length == 0 || _.contains(list, p.condicion);
            }) //
            .filter(p => {
                let list = this.getSelectedCheckboxValues("#filter_resultado input:checkbox:checked");
                return list.length == 0 || _.contains(list, p.resultado);
            }) //
            .filter(p => {
                let list = this.getSelectedCheckboxValues("#filter_torneo input:checkbox:checked");
                return list.length == 0 || _.contains(list, p.tipo);
            }) //
            .filter(p => {
                let anios = $('#anio_slider').slider("option", "values");
                let anio = parseInt(p.anio);
                return anio >= anios[0] && anio <= anios[1];
            }) //
            .value();
    }

    colorMap(p) {
        return p.resultado === 'G' ? '#0000FF' : p.resultado === 'P' ? '#FF0000' : '#FCDC32';
    }

    countPartidos(partidosFiltrados, anio, resultado) {
        return _.chain(partidosFiltrados)
            .filter(p => parseInt(p.anio) <= anio)
            .filter(p => !resultado || p.resultado === resultado)
            .value().length;
    }
    
    gep(serie) {
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
    }

    makeSeries(partidosFiltrados){
        let series = [];
        let resultados = ["G", "E", "P"];
        let inicio = parseInt(partidosFiltrados[0].anio);
        let fin = parseInt(partidosFiltrados[partidosFiltrados.length - 1].anio);
        let statAnios = {
            arriba: 0,
            abajo: 0,
            igual: 0
        }
        let statPorcentaje = {
            porcGan: 0,
            porcEmp: 0,
            porcPer: 0
        }
        var partidosHasta;
        //var totalGanados = 0, totalEmpatados = 0, totalPerdidos = 0;
        for (let i = inicio; i <= fin; i++) {
            partidosHasta = this.countPartidos(partidosFiltrados, i, undefined);
            for(let j = 0; j < resultados.length; j++) {
                let partidosAnioResultado = this.countPartidos(partidosFiltrados, i, resultados[j]);
                series.push({
                    resultado: resultados[j],
                    anio: i.toString(),
                    valor: partidosAnioResultado,
                    porcentaje: partidosAnioResultado / partidosHasta * 100
                });
            }
            let s = series.slice(-3);
            let [ganados, empatados, perdidos] = this.gep(s);
            if (ganados > perdidos) {
                statAnios.arriba = statAnios.arriba + 1;
            } else if(ganados === perdidos) {
                statAnios.igual = statAnios.igual + 1;
            } else {
                statAnios.abajo = statAnios.abajo + 1;
            }
        }
        let s = series.slice(-3);
        let [totalGanados, totalEmpatados, totalPerdidos] = this.gep(s);
        statPorcentaje.porcGan =  totalGanados / partidosHasta * 100;
        statPorcentaje.porcEmp =  totalEmpatados / partidosHasta * 100;
        statPorcentaje.porcPer =  totalPerdidos / partidosHasta * 100;
        return [series, statAnios, statPorcentaje];
    }

    makePartidosPorAnio(partidosFiltrados){
        let partidosPorAnio = _.map(_.groupBy(partidosFiltrados, p => p.anio ), g => {
            return {
                anio: g[0].anio,
                name: "PARTIDOS",
                value: g.length,
                color: "#FCDC32"
            }
        });
        return[partidosPorAnio, _.reduce(partidosPorAnio, (a, b) => a + b.value, 0)];
    }

    drawViz(partidosFiltrados) {
        if (partidosFiltrados.length == 0) {
            $('#myModal .modal-body').text("No se han encontrado partidos para los filtros seleccionados");
            $('#myModal').modal('show');
            return;
        }
        this.resetViz();
        let [series, statAnios, statPorcentaje] = this.makeSeries(partidosFiltrados);
        d3plus.viz()
            .container("#viz")
            .data({
                stroke: { "width": 3 },
                value: series
            })
            .type("line")
            .id("resultado")
            .y({
                value: "valor",
                label: "Cantidad"
            })
            .x({
                value: "anio",
                label: "Año"
            })
            .shape({
                interpolate: 'monotone',
                rendering: 'geometricPrecision'
            })
            .legend({
                align: "end",
                data: true,
                labels: true,
                value: true,
                order(a) {
                    return _.sortBy(a, o => o.valor).reverse();
                }
            })
            .color(this.colorMap)
            .format("es_ES")
            .height(400) // IMPORTANTE!!  Bootstrap is setting min-height: 1px on the col divs
            .draw();
        if(this.getSelectedCheckboxValues("#filter_resultado input:checkbox:checked").length == 0) {
            $('#stats').html(`A&ntilde;os arriba: ${statAnios.arriba} - A&ntilde;os iguales: ${statAnios.igual} - A&ntilde;os abajo: ${statAnios.abajo}`);            
        } else {
            $('#stats').html("Filtro seleccionado inv&aacute;lido para mostrar esta informaci&oacute;n");                        
        }

        let dataPie = series.slice(-3);
        d3plus.viz()
            .container("#viz2")
            .data(dataPie)
            .type("pie")
            .id("resultado")
            .size("valor")
            .format("es_ES")
            .color(this.colorMap)
            .legend({
                align: "end",
                data: true,
                labels: true,
                value: true,
                order: {
                    "sort": "desc",
                    "value": "size"
                }
            })
            .height(400) // IMPORTANTE!!  Bootstrap is setting min-height: 1px on the col divs
            .draw();
        let gep = this.gep(dataPie);
        $('#statsPie').html(`Ganados: ${gep[0]} - Empatados: ${gep[1]} - Perdidos: ${gep[2]}`);

        let [partidosPorAnio, totalPartidos] = this.makePartidosPorAnio(partidosFiltrados);
        d3plus.viz()
            .container("#viz3")
            .data(partidosPorAnio)
            .type("stacked")
            .id("name")
            .text("name")
            .color("color")
            .y({
                value: "value",
                label: "Cantidad"
            })
            .x({
                value: "anio",
                label: "Año"
            })
            .format("es_ES")
            .height(400) // IMPORTANTE!!  Bootstrap is setting min-height: 1px on the col divs
            .draw()
        $('#statsStack').text(`Total de partidos: ${totalPartidos}`);

        d3plus.viz()
            .container("#viz4")
            .data(series)
            .type("stacked")
            .text("resultado")
            .id("resultado")
            .y({
                value: "porcentaje",
                label: "%"
            })
            .x({
                value: "anio",
                label: "Año"
            })
            .color(this.colorMap)
            .legend({
                align: "end",
                data: true,
                labels: true,
                value: true,
                order(a) {
                    return _.sortBy(a, o => o.valor).reverse();
                }
            })
            .format("es_ES")
            .height(400) // IMPORTANTE!!  Bootstrap is setting min-height: 1px on the col divs
            .draw();            
        $('#statsPorcentaje').text(`Ganados: ${statPorcentaje.porcGan.toFixed(2)}% - Empatados: ${statPorcentaje.porcEmp.toFixed(2)}% - Perdidos: ${statPorcentaje.porcPer.toFixed(2)}%`);
    }
}

$(document).ready(function () {
    $('body').sectionScroll({
        topOffset: 80
    });
    d3.json(`partidos.json?r=${new Date().getTime()}`, data =>  new App(data).init());
});