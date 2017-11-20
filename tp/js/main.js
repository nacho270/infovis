(() => 'use strict'());

//HELP: https://github.com/alexandersimoes/d3plus/wiki/Visualizations

class App {

    constructor(partidos, titulos) {
        this.partidos = partidos;
        this.titulos = titulos;
    }

    init() {
        this.initSlider();
        this.initEvents();
        this.drawTrophiesViz();
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
            igual: 0,
            mayorDiferenciaAFavor: {
                anio:0,
                cantidad:0
            },
            mayorDiferenciaEnContra: {
                anio: 0,
                cantidad: 0
            }
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
                if(ganados > statAnios.mayorDiferenciaAFavor.cantidad) {
                    statAnios.mayorDiferenciaAFavor.cantidad = ganados - perdidos;
                    statAnios.mayorDiferenciaAFavor.anio = i;
                }
            } else if(ganados === perdidos) {
                statAnios.igual = statAnios.igual + 1;
            } else {
                statAnios.abajo = statAnios.abajo + 1;
                if(perdidos > statAnios.mayorDiferenciaEnContra.cantidad) {
                    statAnios.mayorDiferenciaEnContra.cantidad = perdidos - ganados;
                    statAnios.mayorDiferenciaEnContra.anio = i;
                }
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
        return[partidosPorAnio,
               _.reduce(partidosPorAnio, (a, b) => a + b.value, 0),
               _.max(partidosPorAnio, (a) => a.value),
               _.min(partidosPorAnio, (a) => a.value)];
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
            .height(500) // IMPORTANTE!!  Bootstrap is setting min-height: 1px on the col divs
            .draw();
        if(this.getSelectedCheckboxValues("#filter_resultado input:checkbox:checked").length == 0) {
            $('#stats').html(`A&ntilde;os arriba: ${statAnios.arriba} - ` + 
                             `A&ntilde;os iguales: ${statAnios.igual} - ` +
                             `A&ntilde;os abajo: ${statAnios.abajo} <br/> ` +
                             `Mayor diferencia a favor: ${statAnios.mayorDiferenciaAFavor.cantidad} (${statAnios.mayorDiferenciaAFavor.anio}) - ` +
                             `Mayor diferencia en contra: ${statAnios.mayorDiferenciaEnContra.cantidad} (${statAnios.mayorDiferenciaEnContra.anio})`);            
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

        let [partidosPorAnio, totalPartidos, maxAnio, minAnio] = this.makePartidosPorAnio(partidosFiltrados);
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
        $('#statsStack').html(`Total de partidos: ${totalPartidos} - ` +
                              `M&aacute;s partidos: ${maxAnio.anio} (${maxAnio.value}) - ` +
                              `Menos partidos: ${minAnio.anio} (${minAnio.value})`);

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

    drawTrophiesViz() {
        let margin = {top: 50, right: 30, bottom: 10, left: 120},
        width = 670 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;
        let y = d3.scale.ordinal().rangeRoundBands([0, height], .3);
        let x = d3.scale.linear().rangeRound([0, width]);
        let color = d3.scale.ordinal().range(["#0000FF", "#FF0000"]);
        let xAxis = d3.svg.axis()
            .scale(x)
            .orient("top");
        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");
        
        let svg = d3.select("#viz5").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("id", "d3-plot")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        color.domain(["Boca", "River"]);
        var oThis = this;
        this.titulos.forEach((d) => {
            var x0 = -1*(d["Boca"]);
            var idx = -1;
            d.boxes = color.domain().map((name) => { 
                idx++;
                return {
                    name: name, 
                    x0: x0, 
                    x1: x0 += +d[name], 
                    N: +d.N, 
                    n: +d[idx === 0 ? "Boca":"River"]
                }; 
            });
        });
        
        var min_val = d3.min(this.titulos, (d) => d.boxes["0"].x0); 
        var max_val = d3.max(this.titulos, (d) => d.boxes["1"].x1);    
        x.domain([min_val, max_val]).nice();
        y.domain(this.titulos.map((d) => d.Copa));
     
        svg.append("g")
            .attr("class", "x axis")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)

        var vakken = svg.selectAll(".copa")
            .data(this.titulos)
            .enter().append("g")
            .attr("class", "bar")
            .attr("transform", (d) => "translate(0," + y(d.Copa) + ")");

        var bars = vakken.selectAll("rect")
            .data((d) => d.boxes)
            .enter().append("g").attr("class", "subbar");

        bars.append("rect")
            .attr("height", y.rangeBand())
            .attr("x", (d) => x(d.x0))
            .attr("width", (d) => x(d.x1) - x(d.x0))
            .style("fill", (d) =>  color(d.name));

        bars.append("text")
            .attr("x", (d) => x(d.x0))
            .attr("y", y.rangeBand()/2)
            .attr("dy", "0.5em")
            .attr("dx", "0.5em")
            .attr("fill", (a) => a.name === "Boca" ? "#FCDC32" : "#FFFFFF")
            .style("font" ,"10px sans-serif")
            .style("text-anchor", "begin")
            .text((d) => d.n !== 0 && (d.x1-d.x0)>3 ? d.n : "");

        vakken.insert("rect",":first-child")
            .attr("height", y.rangeBand())
            .attr("x", "1")
            .attr("width", width)
            .attr("fill-opacity", "0.5")
            .style("fill", "#F5F5F5")
            .attr("class", (d,index) => index%2==0 ? "even" : "uneven"); 
        
        svg.append("g")
            .attr("class", "y axis")
            .append("line")
            .attr("x1", x(0))
            .attr("x2", x(0))
            .attr("y2", height);
        
        var startp = svg.append("g").attr("class", "legendbox").attr("id", "mylegendbox");
        var legend_tabs = [0, 120, 200, 375, 450];
        var legend = startp.selectAll(".legend")
            .data(color.domain().slice())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => "translate(" + legend_tabs[i] + ",-45)");

        legend.append("rect")
            .attr("x", 0)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", color);

        legend.append("text")
            .attr("x", 22)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "begin")
            .style("font" ,"10px sans-serif")
            .text((d) => d);

        d3.selectAll(".axis path")
            .style("fill", "none")
            .style("stroke", "#000")
            .style("shape-rendering", "crispEdges")

        d3.selectAll(".axis line")
            .style("fill", "none")
            .style("stroke", "#000")
            .style("shape-rendering", "crispEdges")

        var movesize = width/2 - startp.node().getBBox().width/2;
        d3.selectAll(".legendbox").attr("transform", "translate(" + movesize  + ",0)");
    }
}

$(document).ready(function () {
    $('body').sectionScroll({
        topOffset: 80
    });
    d3.json(`partidos.json?r=${new Date().getTime()}`, partidos =>  {
        d3.csv(`titulos.csv?r=${new Date().getTime()}`, (error, titulos) => {
            new App(partidos, titulos).init();
        });
    });
});