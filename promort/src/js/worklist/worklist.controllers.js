/*
 * Copyright (c) 2019, CRS4
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

(function () {
    'use strict';
    
    angular
        .module('promort.worklist.controllers')
        .controller('WorkListController', WorkListController)
        .controller('ROIsAnnotationController', ROIsAnnotationController)
        .controller('ClinicalAnnotationController', ClinicalAnnotationController)
        .controller('PredictionReviewController', PredictionReviewController);
    
    WorkListController.$inject = ['$scope', '$log', '$location', 'Authentication', 'WorkListService',
                                  'CurrentPredictionDetailsService'];
    
    function WorkListController($scope, $log, $location, Authentication, WorkListService,
                                CurrentPredictionDetailsService) {
        var vm = this;
        vm.pendingAnnotations = [];
        vm.annotationInProgress = annotationInProgress;
        vm.annotationClosed = annotationClosed;
        vm.checkPendingAnnotations = checkPendingAnnotations;
        vm.isROIsAnnotation = isROIsAnnotation;
        vm.isClinicalAnnotation = isClinicalAnnotation;
        vm.isQuestionnaireRequest = isQuestionnaireRequest;
        vm.isPredictionReview = isPredictionReview;
        vm.canStartClinicalAnnotation = canStartClinicalAnnotation;
        vm.getAnnotationLink = getAnnotationLink;
        vm.startROIsAnnotation = startROIsAnnotation;
        vm.closeROIsAnnotation = closeROIsAnnotation;
        vm.startClinicalAnnotation = startClinicalAnnotation;
        vm.closeClinicalAnnotation = closeClinicalAnnotation;
        vm.startQuestionnaireRequest = startQuestionnaireRequest;
        vm.startPredictionReview = startPredictionReview;
        
        activate();
        
        function activate() {
            WorkListService.get().then(workListSuccessFn, workListErrorFn);
            
            function workListSuccessFn(response) {
                vm.pendingAnnotations = response.data;
            }
            
            function workListErrorFn(response) {
                $log.error(response.error);
            }
        }

        function annotationInProgress(annotation) {
            return (annotation.started && !annotation.completed );
        }

        function annotationClosed(annotation) {
            return annotation.completed;
        }

        function checkPendingAnnotations() {
            for (var i in vm.pendingAnnotations) {
                if (vm.annotationInProgress(vm.pendingAnnotations[i])) {
                    return true;
                }
            }
            return false;
        }

        function isROIsAnnotation(annotation) {
            return annotation.annotation_type === 'ROIS_ANNOTATION';
        }

        function isClinicalAnnotation(annotation) {
            return annotation.annotation_type === 'CLINICAL_ANNOTATION';
        }

        function isQuestionnaireRequest(annotation) {
            return annotation.annotation_type === 'QUESTIONNAIRE';
        }

        function isPredictionReview(annotation) {
            return annotation.annotation_type === 'PREDICTION_REVIEW';
        }

        function canStartClinicalAnnotation(annotation) {
            if (vm.isClinicalAnnotation(annotation)) {
                return annotation.can_be_started;
            } else {
                return undefined;
            }
        }
        
        function getAnnotationLink(annotation) {
            if (vm.isROIsAnnotation(annotation)) {
                return 'worklist/rois_annotations/' + annotation.label;
            } else if (vm.isClinicalAnnotation(annotation)) {
                return 'worklist/clinical_annotations/' + annotation.label;
            } else if (vm.isQuestionnaireRequest(annotation)) {
                return 'worklist/questionnaire_requests/' + annotation.label;
            } else if (vm.isPredictionReview(annotation)) {
                // TODO: switch to a case based pagination
                return 'worklist/' + annotation.label + '/prediction_review';
            }
        }
        
        function startROIsAnnotation(annotation) {
            WorkListService.startROIsAnnotation(annotation.label);
        }

        function closeROIsAnnotation(annotation) {
            WorkListService.closeROIsAnnotation(annotation.label);
        }

        function startClinicalAnnotation(annotation) {
            WorkListService.startClinicalAnnotation(annotation.label);
        }

        function closeClinicalAnnotation(annotation) {
            WorkListService.closeClinicalAnnotation(annotation.label);
        }

        function startQuestionnaireRequest(annotation) {
            WorkListService.startQuestionnaireRequest(annotation.label);
        }

        function startPredictionReview(annotation) {
            // TODO: move to PredictionReviewController when switching to a case based interface
            CurrentPredictionDetailsService.getPredictionByReviewStep(annotation.label)
                .then(getPredictionSuccessFn, getPredictionErrorFn);

            function getPredictionSuccessFn(response) {
                CurrentPredictionDetailsService.registerCurrentPrediction(
                    response.data.id, response.data.slide.id, response.data.slide.case
                );
                $location.url(vm.getAnnotationLink(annotation));
            }

            function getPredictionErrorFn(response) {
                $log.error('Error when starting prediction review');
                $log.error(response);
            }
        }
    }
    
    ROIsAnnotationController.$inject = ['$scope', '$routeParams', '$location', '$log', 'ngDialog',
        'ROIsAnnotationStepService', 'CurrentSlideDetailsService', 'CurrentAnnotationStepsDetailsService'];

    function ROIsAnnotationController($scope, $routeParams, $location, $log, ngDialog, ROIsAnnotationStepService,
                                      CurrentSlideDetailsService, CurrentAnnotationStepsDetailsService) {
        var vm = this;
        vm.annotationSteps = [];
        vm.label = undefined;
        vm.annotationSlideEvaluationExists = annotationSlideEvaluationExists;
        vm.annotationQualityControlPassed = annotationQualityControlPassed;
        vm.slideEvaluationNotesExist = slideEvaluationNotesExist;
        vm.annotationStepPending = annotationStepPending;
        vm.annotationStepInProgress = annotationStepInProgress;
        vm.annotationStepCompleted = annotationStepCompleted;
        vm.startAnnotation = startAnnotation;
        vm.resetROIsAnnotationStep = resetROIsAnnotationStep;

        activate();

        function activate() {
            vm.label = $routeParams.label;
            ROIsAnnotationStepService.get(vm.label)
                .then(AnnotationStepsSuccessFn, AnnotationStepsErrorFn);

            function AnnotationStepsSuccessFn(response) {
                vm.annotationSteps = response.data;
            }

            function AnnotationStepsErrorFn(response) {
                $log.error(response.error);
                $location.url('404');
            }
        }

        function annotationSlideEvaluationExists(annotationStep) {
            return annotationStep.slide_evaluation !== null;
        }

        function annotationQualityControlPassed(annotationStep) {
            return annotationStep.slide_evaluation.adequate_slide;
        }

        function slideEvaluationNotesExist(annotationStep) {
            if (vm.annotationSlideEvaluationExists(annotationStep)) {
                return annotationStep.slide_evaluation.notes !== null;
            } else {
                return false;
            }
        }

        function annotationStepPending(annotationStep) {
            return (!annotationStep.started && !annotationStep.completed);
        }

        function annotationStepInProgress(annotationStep) {
            return (annotationStep.started && !annotationStep.completed);
        }

        function annotationStepCompleted(annotationStep) {
            return annotationStep.completed;
        }

        function resetROIsAnnotationStep(annotationStep) {
            var dialog = ngDialog.openConfirm({
                template: '/static/templates/dialogs/restart_rois_step_confirm.html',
                showClose: false,
                closeByEscape: false,
                closeByNavigation: false,
                closeByDocument: false
            }).then(confirmFn);

            function confirmFn(confirm_value) {
                if (confirm_value) {
                    ROIsAnnotationStepService.resetAnnotationStep(annotationStep.label)
                        .then(reopenStepSuccessFn, reopenStepErrorFn);
                }

                function reopenStepSuccessFn(response) {
                    vm.startAnnotation(annotationStep, true);
                }

                function reopenStepErrorFn(response) {
                    $log.error('Reopen step failed');
                    $log.error(response);
                }
            }
        }

        function startAnnotation(annotationStep, skip_quality_control) {
            var skip_qc = (typeof skip_quality_control === 'undefined') ? false : skip_quality_control;
            CurrentAnnotationStepsDetailsService.setROIsAnnotationStepLabel(annotationStep.label);

            CurrentSlideDetailsService.getSlideByAnnotationStep(annotationStep.label, 'ROIS_ANNOTATION')
                .then(getSlideByAnnotationStepSuccessFn, getSlideByAnnotationStepErrorFn);

            function getSlideByAnnotationStepSuccessFn(response) {
                CurrentSlideDetailsService.registerCurrentSlide(
                    response.data.slide.id, response.data.slide.case
                );
                if (skip_qc === false) {
                    $location.url('worklist/' + annotationStep.label + '/quality_control');
                } else {
                    $location.url('worklist/' + annotationStep.label + '/rois_manager');
                }
            }

            function getSlideByAnnotationStepErrorFn(response) {
                $log.debug(response.error);
                $location.url('404');
            }
        }
    }

    ClinicalAnnotationController.$inject = ['$scope', '$routeParams', '$location', '$route', '$log', 'ngDialog',
        'ClinicalAnnotationStepService', 'CurrentSlideDetailsService', 'CurrentAnnotationStepsDetailsService',
        'ROIsAnnotationStepService'];

    function ClinicalAnnotationController($scope, $routeParams, $location, $route, $log, ngDialog,
                                          ClinicalAnnotationStepService, CurrentSlideDetailsService,
                                          CurrentAnnotationStepsDetailsService, ROIsAnnotationStepService) {
        var vm = this;
        vm.annotationSteps = [];
        vm.label = undefined;
        vm.annotationQualityControlPassed = annotationQualityControlPassed;
        vm.slideEvaluationNotesExist = slideEvaluationNotesExist;
        vm.stepNotesExist = stepNotesExist;
        vm.annotationStepPending = annotationStepPending;
        vm.annotationStepInProgress = annotationStepInProgress;
        vm.annotationStepCompleted = annotationStepCompleted;
        vm.getAnnotationStepLink = getAnnotationStepLink;
        vm._goToAnnotationStep = _goToAnnotationStep;
        vm.startAnnotationStep = startAnnotationStep;
        vm.continueAnnotationStep = continueAnnotationStep;
        vm.resetROIsAnnotationStep = resetROIsAnnotationStep;

        activate();

        function activate() {
            vm.label = $routeParams.label;
            ClinicalAnnotationStepService.get(vm.label)
                .then(AnnotationStepSuccessFn, AnnotationStepErrorFn);

            function AnnotationStepSuccessFn(response) {
                vm.annotationSteps = response.data;
            }

            function AnnotationStepErrorFn(response) {
                $log.error(response.error);
                $location.url('404');
            }
        }

        function annotationQualityControlPassed(annotationStep) {
            return annotationStep.slide_evaluation.adequate_slide;
        }

        function slideEvaluationNotesExist(annotationStep) {
            return annotationStep.slide_evaluation.notes !== null;
        }

        function stepNotesExist(annotationStep) {
            return annotationStep.notes !== null;
        }

        function annotationStepPending(annotationStep) {
            return (!annotationStep.started && !annotationStep.completed);
        }

        function annotationStepInProgress(annotationStep) {
            return (annotationStep.started && !annotationStep.completed);
        }

        function annotationStepCompleted(annotationStep) {
            return annotationStep.completed;
        }

        function getAnnotationStepLink(annotationStep) {
            return 'worklist/' + annotationStep.label + '/annotations_manager';
        }

        function _goToAnnotationStep(annotationStep) {
            CurrentAnnotationStepsDetailsService.findROIsAnnotationStepLabelByClinicalStep(annotationStep.label)
                .then(findROIsAnnotationLabelSuccessFn, findROIsAnnotationLabelErrorFn);

            function findROIsAnnotationLabelSuccessFn(response) {
                CurrentAnnotationStepsDetailsService.setROIsAnnotationStepLabel(response.data.rois_review_step_label);
                CurrentAnnotationStepsDetailsService.setClinicalAnnotationStepLabel(annotationStep.label);

                CurrentSlideDetailsService.getSlideByAnnotationStep(annotationStep.label, 'CLINICAL_ANNOTATION')
                    .then(getSlideByAnnotationStepSuccessFn, getSlideByAnnotationStepErrorFn);

                function getSlideByAnnotationStepSuccessFn(response) {
                    CurrentSlideDetailsService.registerCurrentSlide(
                        response.data.slide, response.data.case
                    );

                    ClinicalAnnotationStepService.startAnnotationStep(annotationStep.label)
                        .then(startStepSuccessFn, startStepErrorFn);

                    function startStepSuccessFn(response) {
                        var url = vm.getAnnotationStepLink(annotationStep);
                        $location.url(url);
                    }

                    function startStepErrorFn(response) {
                        if (response.status === 403) {
                            ngDialog.open({
                                template: '/static/templates/dialogs/clinical_step_cant_start.html',
                                preCloseCallback: function() {
                                    $location.url('worklist');
                                    $route.reload();
                                }
                            });
                        } else if (response.status === 409) {
                            // continue an already opened review
                            var url = vm.getAnnotationStepLink(annotationStep);
                            $location.url(url);
                        }
                    }
                }

                function getSlideByAnnotationStepErrorFn(response) {
                    $log.debug(response.error);
                    $location.url('404');
                }
            }

            function findROIsAnnotationLabelErrorFn(response) {
                $log.error('Cannot load slide info');
                $log.error(response);
            }
        }

        function startAnnotationStep(annotationStep) {
            vm._goToAnnotationStep(annotationStep);
        }

        function continueAnnotationStep(annotationStep) {
            vm._goToAnnotationStep(annotationStep);
        }

        function resetROIsAnnotationStep(annotationStep) {
            if (annotationStep.can_reopen_rois_step) {
                $log.debug('RESET ROIs annotation step: ' + annotationStep.rois_review_step_label);
                var dialog = ngDialog.openConfirm({
                    template: '/static/templates/dialogs/reopen_rois_step_confirm.html',
                    showClose: false,
                    closeByEscape: false,
                    closeByNavigation: false,
                    closeByDocument: false
                }).then(confirmFn);
            }

            function confirmFn(confirm_value) {
                if (confirm_value) {
                    ROIsAnnotationStepService.resetAnnotationStep(annotationStep.rois_review_step_label)
                        .then(reopenStepSuccessFn, reopenStepErrorFn);
                }

                function reopenStepSuccessFn(response) {
                    var roisAnnotationLabel = annotationStep.rois_review_step_label.split('-')[0];
                    var url = 'worklist/rois_annotations/' + roisAnnotationLabel;
                    $location.url(url);
                }

                function reopenStepErrorFn(response) {
                    $log.error('Reopen step failed');
                    $log.error(response);
                }
            }
        }
    }

    PredictionReviewController.$inject = ['$scope', '$routeParams', '$location', '$route', '$log',
                                          'CurrentPredictionDetailsService'];

    function PredictionReviewController($scope, $routeParams, $location, $route, $log,
                                        CurrentPredictionDetailsService) {
        var vm = this;
        vm.startPredictionReview = startPredictionReview;
        vm.getPredictionReviewLink = getPredictionReviewLink;

        activate();

        function activate() {
            // TODO: needed when switching to a case based view for prediction reviews
        }

        function startPredictionReview(label) {
            CurrentPredictionDetailsService.getPredictionByReviewStep(label)
                .then(getPredictionSuccessFn, getPredictionErrorFn);

            function getPredictionSuccessFn(response) {
                CurrentPredictionDetailsService.registerCurrentSlide(
                    response.data.id, response.data.slide.id, response.data.slide.case
                );
            }

            function getPredictionErrorFn(response) {
                // TODO: implement
            }
        }

        function getPredictionReviewLink(label) {
            // TODO: implement
        }
    }
})();