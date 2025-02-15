package utils

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// ClusterConnectionResult holds the result of connecting to a cluster context.
type ClusterConnectionResult struct {
	ContextName string `json:"contextName"`
	Connected   bool   `json:"connected"`
	Error       string `json:"error,omitempty"`
}

// connectClustersHandler is an HTTP handler that processes the uploaded kubeconfig file.
func connectClustersHandler(w http.ResponseWriter, r *http.Request) {
	// Only allow POST requests.
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse the multipart form (limit file size to 10MB).
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, fmt.Sprintf("failed to parse multipart form: %v", err), http.StatusBadRequest)
		return
	}

	// Retrieve the file from the form input "kubefile".
	file, _, err := r.FormFile("kubefile")
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to retrieve file: %v", err), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read the contents of the file.
	kubeConfigData, err := ioutil.ReadAll(file)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to read file: %v", err), http.StatusInternalServerError)
		return
	}

	// Load the kubeconfig from the file data.
	kubeConfig, err := clientcmd.Load(kubeConfigData)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to load kubeconfig: %v", err), http.StatusBadRequest)
		return
	}

	// Prepare a slice to collect connection results.
	var results []ClusterConnectionResult

	// Iterate over each context in the kubeconfig.
	for contextName := range kubeConfig.Contexts {
		// Override the current context to the one we want to test.
		overrides := &clientcmd.ConfigOverrides{CurrentContext: contextName}
		clientConfig := clientcmd.NewDefaultClientConfig(*kubeConfig, overrides)

		// Create the rest.Config for the current context.
		restConfig, err := clientConfig.ClientConfig()
		if err != nil {
			results = append(results, ClusterConnectionResult{
				ContextName: contextName,
				Connected:   false,
				Error:       fmt.Sprintf("creating rest config failed: %v", err),
			})
			continue
		}

		// Create the Kubernetes clientset.
		clientset, err := kubernetes.NewForConfig(restConfig)
		if err != nil {
			results = append(results, ClusterConnectionResult{
				ContextName: contextName,
				Connected:   false,
				Error:       fmt.Sprintf("creating clientset failed: %v", err),
			})
			continue
		}

		// Test the connection by listing namespaces.
		if _, err := clientset.CoreV1().Namespaces().List(r.Context(), metav1.ListOptions{}); err != nil {
			results = append(results, ClusterConnectionResult{
				ContextName: contextName,
				Connected:   false,
				Error:       fmt.Sprintf("listing namespaces failed: %v", err),
			})
			continue
		}

		// If no errors occurred, mark the connection as successful.
		results = append(results, ClusterConnectionResult{
			ContextName: contextName,
			Connected:   true,
		})
	}

	// Return the results as JSON.
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}